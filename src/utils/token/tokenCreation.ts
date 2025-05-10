
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  SendTransactionError,
  ComputeBudgetProgram
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

    // CRITICAL: Initialize Transaction with EXTREME compute budget
    const transaction = new Transaction();
    const walletPubkey = new PublicKey(walletAddress);
    
    // SUPER HIGH compute budget - Token-2022 needs much more than standard SPL tokens
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1400000 // Significantly increased again (maximum allowed)
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000 // Prioritize this transaction
      })
    );
    
    // Calculate required account size for Token-2022 with metadata
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Calculated total account size: ${totalSize} bytes`);
    
    // Get minimum required lamports with very high safety margin
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    const mintLamports = rentExemption * 3; // Triple the required lamports for safety
    console.log(`Required lamports for rent exemption: ${rentExemption}, allocating: ${mintLamports}`);
    
    // CRITICAL FIX: Create account with the correct space and MUCH more lamports
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    });
    
    // CRITICAL ORDER: Follow Token-2022 initialization sequence precisely
    // 1. First create the account
    transaction.add(createAccountInstruction);
    
    // 2. Then initialize the metadata pointer extension
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey,     // Mint account
      walletPubkey,       // Update authority
      mint.publicKey,     // Metadata address (self-referential for Token-2022)
      TOKEN_2022_PROGRAM_ID
    );
    transaction.add(metadataPointerInstruction);
    
    // 3. Then initialize the mint with decimals
    const decimals = eventDetails.decimals || 0;
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey,      // Mint authority
      null,              // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    transaction.add(initializeMintInstruction);
    
    // 4. Finally initialize the metadata
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,  // Same as mint for Token-2022 metadata pointer
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    transaction.add(initializeMetadataInstruction);
    
    // Set fee payer explicitly
    transaction.feePayer = walletPubkey;
    
    try {
      // Get latest blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      
      // Sign with the mint keypair FIRST (critical order)
      transaction.partialSign(mint);
      
      console.log("Transaction prepared, requesting wallet signature...");
      console.log("Transaction contains", transaction.instructions.length, "instructions");
      
      // Log instructions for debugging
      transaction.instructions.forEach((instr, i) => {
        console.log(`Instruction ${i}: programId=${instr.programId.toBase58()}, keys=${instr.keys.length}`);
      });
      
      // Run simulation with full logs to catch errors
      try {
        console.log("Simulating transaction before sending...");
        const simulation = await connection.simulateTransaction(transaction, {
          sigVerify: false,
          replaceRecentBlockhash: true,
          commitment: 'processed',
        });
        
        if (simulation.value.err) {
          console.error("Transaction simulation failed:", simulation.value.err);
          console.error("Simulation logs:", simulation.value.logs);
          
          // Try to continue despite simulation error - sometimes it works anyway
        } else {
          console.log("Transaction simulation successful");
        }
      } catch (simError) {
        console.error("Error simulating transaction:", simError);
        // Continue despite simulation error
      }
      
      // Sign with wallet AFTER mint key has signed
      const signedTransaction = await signTransaction(transaction);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // CRITICAL: Send with MAX preflight disable and retries
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        maxRetries: 10,
        preflightCommitment: 'processed'
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Wait for confirmation with more retries and longer timeout
      console.log("Waiting for confirmation...");
      const confirmation = await connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed to confirm: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed:", confirmation);
      
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
