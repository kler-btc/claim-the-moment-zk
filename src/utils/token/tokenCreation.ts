
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
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createInitializeInstruction } from '@solana/spl-token';
import { TokenMetadata, TokenCreationResult, EventDetails } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
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
    
    // Set token metadata - trim values to avoid overflow
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title.substring(0, 32), // 32 characters max for name
      symbol: eventDetails.symbol.substring(0, 10), // 10 characters max for symbol
      uri: eventDetails.imageUrl.substring(0, 200), // Limit URI length
      additionalMetadata: [
        ['description', (eventDetails.description || '').substring(0, 500)],
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location],
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;

    // CRITICAL: Set higher compute budget for Token-2022 operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Set higher priority fee to improve chances of confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000
    });
    
    // FIXED: Calculate space correctly for Token-2022 with metadata
    // Get base mint size with all required extensions
    const extensions = [ExtensionType.MetadataPointer];
    const baseMintLen = getMintLen(extensions);
    console.log(`Base mint size with MetadataPointer extension: ${baseMintLen}`);
    
    // Calculate metadata space - much more precise calculation
    let metadataSize = 0;
    // Name, symbol and URI (each with 4-byte length prefix)
    metadataSize += 4 + Buffer.from(metadata.name).length;
    metadataSize += 4 + Buffer.from(metadata.symbol).length;
    metadataSize += 4 + Buffer.from(metadata.uri).length;
    
    // Additional metadata array length (u32)
    metadataSize += 4;
    
    // Each additional metadata entry
    if (metadata.additionalMetadata) {
      for (const [key, value] of metadata.additionalMetadata) {
        metadataSize += 4 + Buffer.from(key).length;
        metadataSize += 4 + Buffer.from(value).length;
      }
    }
    
    // Add metadata header size (32 bytes) and alignment padding
    const metadataHeaderSize = 32;
    metadataSize = metadataHeaderSize + metadataSize;
    
    // CRITICAL: Allocate much more space than calculated to ensure success
    // Token-2022 metadata needs more space than the raw data size
    const totalSize = baseMintLen + metadataSize + 10240; // Adding 10KB padding for safety
    console.log(`Total calculated size needed for mint+metadata: ${totalSize}`);
    
    // Calculate rent exemption with precise size
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption}, allocating: ${rentExemption * 2} lamports`);
    
    const walletPubkey = new PublicKey(walletAddress);
    
    // Build transaction with precise instruction ordering
    const instructions = [
      // 1. Set compute budget first
      computeBudgetIx,
      priorityFeeIx,
      
      // 2. Create system account with correct space
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mint.publicKey,
        space: totalSize,
        lamports: rentExemption * 2, // Double for safety
        programId: TOKEN_2022_PROGRAM_ID
      }),
      
      // 3. CRITICAL: Initialize metadata pointer extension FIRST
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        walletPubkey,
        mint.publicKey, // Metadata pointer to self
        TOKEN_2022_PROGRAM_ID
      ),
      
      // 4. Initialize mint second
      createInitializeMintInstruction(
        mint.publicKey,
        eventDetails.decimals || 0,
        walletPubkey,
        null, // No freeze authority
        TOKEN_2022_PROGRAM_ID
      ),
      
      // 5. Initialize metadata last
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
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    console.log("Transaction prepared with", tx.instructions.length, "instructions");
    console.log("Instructions:", tx.instructions.map((ix, i) => 
      `${i}: ${ix.programId.toString().substring(0, 10)}...`).join(', '));
    
    try {
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // IMPROVED: More reliable transaction sending
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true, // Skip preflight to avoid transaction simulation errors
        maxRetries: 5
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // FIXED: More reliable confirmation approach
      console.log("Waiting for confirmation...");
      
      // Wait for confirmation with proper timeout handling
      const confirmed = await Promise.race([
        connection.confirmTransaction(
          {
            signature: txid,
            blockhash: tx.recentBlockhash,
            lastValidBlockHeight: (await connection.getBlockHeight()) + 150
          },
          'confirmed'
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
        )
      ]).catch(error => {
        console.error('Confirmation error:', error);
        return { value: { err: 'timeout' } };
      });
      
      // FIX: Type check for confirmation result
      if (confirmed && 
          typeof confirmed === 'object' && 
          'value' in confirmed && 
          confirmed.value && 
          typeof confirmed.value === 'object' && 
          'err' in confirmed.value) {
        throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmed.value.err)}`);
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
