
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

    // ========= CRITICAL: Follow Light Protocol's recommended approach =========
    
    // Set extreme compute budget for Token-2022 with metadata operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Set higher priority fee to improve chances of confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 10000
    });
    
    // Calculate sizes precisely for Token-2022 with metadata extension
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataSize = calculateMetadataSize(metadata);
    console.log(`Base mint size: ${mintLen}, Metadata size: ${metadataSize}`);
    
    // Total size with generous padding
    const totalSize = mintLen + metadataSize + 4096; // Extra 4KB padding for absolute safety
    console.log(`Allocating total size: ${totalSize} bytes for mint account`);
    
    // Get much more than minimum required lamports for rent exemption
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    const mintLamports = rentExemption * 10; // 10x the required lamports for absolute safety
    console.log(`Required rent: ${rentExemption}, allocating: ${mintLamports} lamports`);
    
    const walletPubkey = new PublicKey(walletAddress);
    
    // ========= STEP 1: Create a transaction for better reliability =========
    // Following Light Protocol's recommended transaction pattern
    
    // Build instructions in the exact required sequence
    const instructions = [
      computeBudgetIx,
      priorityFeeIx,
      // Create system account with ample space
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mint.publicKey,
        space: totalSize,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      // Initialize metadata pointer extension FIRST
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        walletPubkey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize mint with proper decimals
      createInitializeMintInstruction(
        mint.publicKey,
        eventDetails.decimals || 0,
        walletPubkey,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize metadata last
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mint.publicKey,
        metadata: mint.publicKey,
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
    
    // Sign with mint keypair
    tx.partialSign(mint);
    
    console.log("Transaction prepared with", tx.instructions.length, "instructions");
    
    try {
      // Have the wallet sign after the mint keypair
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send with preflight disabled for higher success chance
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 5
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Fix the confirmation strategy - use a simpler approach that works with web3.js
      console.log("Waiting for confirmation...");
      await connection.confirmTransaction(txid, 'confirmed');
      
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
