
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  SendTransactionError,
  ComputeBudgetProgram,
  Signer
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

    // *** CRITICAL: Follow exact Token-2022 sequence with proper configuration ***
    // Create a new transaction
    const transaction = new Transaction();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Set extreme compute budget - Token-2022 with metadata requires much more compute
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1400000 // Maximum allowed compute
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000 // Higher priority
      })
    );
    
    // Calculate sizes precisely for Token-2022 with metadata extension
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataSize = calculateMetadataSize(metadata);
    console.log(`Base mint size: ${mintLen}, Metadata size: ${metadataSize}`);
    
    // Total size with generous padding
    const totalSize = mintLen + metadataSize + 2048; // Extra 2KB padding for safety
    console.log(`Allocating total size: ${totalSize} bytes for mint account`);
    
    // Get much more than minimum required lamports for rent exemption
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    const mintLamports = rentExemption * 5; // 5x the required lamports for absolute safety
    console.log(`Required rent: ${rentExemption}, allocating: ${mintLamports} lamports`);
    
    // STEP 1: Create account with ample space and lamports
    // This follows the checklist pattern from the documentation
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    });
    transaction.add(createAccountIx);
    
    // STEP 2: Initialize metadata pointer extension FIRST (correct order)
    // This must come before initializing the mint itself
    const metadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,     // Mint account
      walletPubkey,       // Authority
      mint.publicKey,     // Self-referential for Token-2022
      TOKEN_2022_PROGRAM_ID
    );
    transaction.add(metadataPointerIx);
    
    // STEP 3: Initialize the mint with proper decimals
    const decimals = eventDetails.decimals || 0;
    const initializeMintIx = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey,      // Mint authority
      null,              // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    transaction.add(initializeMintIx);
    
    // STEP 4: Initialize the metadata
    const initializeMetadataIx = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,  // Same address for Token-2022
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    transaction.add(initializeMetadataIx);
    
    // Set fee payer explicitly
    transaction.feePayer = walletPubkey;
    
    try {
      // Get latest blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      // Sign with mint keypair first
      transaction.partialSign(mint);
      
      console.log("Transaction prepared with", transaction.instructions.length, "instructions");
      
      // Sign with wallet (after mint has signed)
      const signedTransaction = await signTransaction(transaction);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send with preflight disabled for higher success chance
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 5
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Wait for confirmation with longer timeout
      console.log("Waiting for confirmation...");
      const confirmation = await connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed to confirm: ${JSON.stringify(confirmation.value.err)}`);
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
