
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  SendTransactionError,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  createInitializeMetadataPointerInstruction,
} from '@solana/spl-token';
import { createInitializeInstruction } from '@solana/spl-token';
import { TokenMetadata, TokenCreationResult, EventDetails, TOKEN_2022_PROGRAM_ID } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { calculateMetadataSize } from './tokenMetadataUtils';
import { eventService } from '@/lib/db';

/**
 * Creates a token with metadata using Token-2022 program
 */
export const createToken = async (
  eventDetails: EventDetails,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenCreationResult> => {
  console.log('Creating token with metadata for event:', eventDetails.title);
  console.log('Using wallet:', walletAddress);

  try {
    // Generate a new keypair for the mint
    const mint = Keypair.generate();
    console.log('Generated mint keypair:', mint.publicKey.toBase58());
    
    // Set token metadata
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title.substring(0, 32), // Truncate to avoid overflows
      symbol: eventDetails.symbol.substring(0, 10), // Truncate to avoid overflows
      uri: eventDetails.imageUrl.substring(0, 200), // Truncate to avoid overflows
      additionalMetadata: [
        ['description', eventDetails.description || ''],
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location],
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;

    // ========= CRITICAL: Fix for Account Creation and Space Allocation =========
    
    // Set extreme compute budget for Token-2022 with metadata operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Set higher priority fee to improve chances of confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000 // Increased for better priority
    });
    
    // Get the exact base size for a mint with metadata pointer extension
    const baseMintLen = getMintLen([ExtensionType.MetadataPointer]);
    console.log(`Base mint size with MetadataPointer extension: ${baseMintLen}`);
    
    // Calculate the total size needed with our improved calculation function
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Total calculated size needed for mint+metadata: ${totalSize}`);
    
    // Get minimum lamports needed for rent exemption with this size
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    // Allocate 2x the required lamports for absolute safety
    const mintLamports = rentExemption * 2;
    console.log(`Required rent: ${rentExemption}, allocating: ${mintLamports} lamports`);
    
    const walletPubkey = new PublicKey(walletAddress);
    
    // ========= STEP 1: Create Transaction with Proper Sequence =========
    
    // Build instructions in the EXACT required sequence for Token-2022
    const instructions = [
      // 1. Set compute budget first
      computeBudgetIx,
      priorityFeeIx,
      
      // 2. Create system account with exact calculated space
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mint.publicKey,
        space: totalSize,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      
      // 3. CRITICAL: Initialize metadata pointer extension FIRST
      // This must come before mint initialization
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        walletPubkey,
        mint.publicKey, // Metadata pointer points to the mint itself
        TOKEN_2022_PROGRAM_ID
      ),
      
      // 4. Initialize mint with proper decimals
      createInitializeMintInstruction(
        mint.publicKey,
        eventDetails.decimals || 0,
        walletPubkey,
        null, // No freeze authority
        TOKEN_2022_PROGRAM_ID
      ),
      
      // 5. Initialize metadata LAST
      // This must come after both the pointer and mint initialization
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mint.publicKey,
        metadata: mint.publicKey, // Same as mint (Token-2022 pattern)
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: walletPubkey,
        updateAuthority: walletPubkey
      })
    ];

    // Create a standard transaction
    const tx = new Transaction().add(...instructions);
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    
    // Sign with mint keypair first
    tx.partialSign(mint);
    
    console.log("Transaction prepared with", tx.instructions.length, "instructions");
    console.log("Instructions:", tx.instructions.map((ix, i) => 
      `${i}: ${ix.programId.toString().substring(0, 10)}...`).join(', '));
    
    try {
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send with preflight disabled for higher success chance
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 5
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Use a simpler confirmation approach that works better for browsers
      console.log("Waiting for confirmation...");
      
      // Simplified confirmation approach - just wait for status
      let status = null;
      for (let i = 0; i < 30; i++) {
        try {
          status = await connection.getSignatureStatus(txid);
          if (status && status.value && status.value.confirmationStatus === 'confirmed') {
            break;
          }
          console.log(`Waiting for confirmation (attempt ${i+1}/30)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.log(`Error checking confirmation: ${err}`);
        }
      }
      
      // Check for confirmation failure
      if (!status || !status.value || status.value.confirmationStatus !== 'confirmed') {
        throw new Error(`Transaction not confirmed after 30 seconds`);
      }
      
      // Check for transaction errors
      if (status.value.err) {
        throw new Error(`Transaction confirmed but failed: ${JSON.stringify(status.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully");
      
      // Store event data
      await eventService.saveEvent({
        id: eventId,
        mintAddress: mint.publicKey.toBase58(),
        ...eventDetails,
        createdAt: new Date().toISOString(),
        creator: walletAddress,
        transactionId: txid
      });
      
      console.log('Token created successfully with txid:', txid);
      
      return {
        eventId,
        mintAddress: mint.publicKey.toBase58(),
        transactionId: txid
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      
      if (error instanceof SendTransactionError) {
        console.error('Transaction error logs:', error.logs);
        
        // Extract specific error information from logs
        let errorMessage = "Transaction failed";
        if (error.logs) {
          // Find the most relevant error message in the logs
          const relevantErrorLog = error.logs.find(log => 
            log.includes('Error') || 
            log.includes('failed') || 
            log.includes('InvalidAccountData') ||
            log.includes('Transaction too large')
          );
          
          if (relevantErrorLog) {
            errorMessage = relevantErrorLog;
          }
        }
        
        throw new Error(`Token creation failed: ${errorMessage}`);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
