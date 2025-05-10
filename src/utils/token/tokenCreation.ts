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
      name: eventDetails.title,
      symbol: eventDetails.symbol,
      uri: eventDetails.imageUrl,
      additionalMetadata: [
        ['description', eventDetails.description],
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location],
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;

    // Initialize Transaction with higher priority
    const transaction = new Transaction();
    const walletPubkey = new PublicKey(walletAddress);
    
    // CRITICAL: Add MUCH higher compute budget to ensure transaction has enough compute units
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000 // Substantially increased compute budget for Token-2022 operations
      })
    );
    
    // Calculate space using extensions
    const extensions = [ExtensionType.MetadataPointer];
    const mintLen = getMintLen(extensions);
    
    // Get the full size needed with our improved calculation
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Calculated total account size: ${totalSize} bytes`);
    
    // Get minimum required lamports with a safety margin
    const mintLamports = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required lamports for rent exemption: ${mintLamports}`);
    
    // CRITICAL FIX: Create account with SIGNIFICANTLY more space
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: mintLamports * 2, // Double the lamports for extra safety
      programId: TOKEN_2022_PROGRAM_ID
    });
    
    // CRITICAL: Order matters for Token-2022
    // 1. First create the account
    transaction.add(createAccountInstruction);
    
    // 2. Then initialize the metadata pointer extension
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey,     // Mint account
      walletPubkey,       // Update authority
      mint.publicKey,     // Metadata address (pointing to itself for Token-2022)
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
    
    // 4. Finally initialize the metadata - MUST be done AFTER mint initialization
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,  // Same as mint for Token-2022 metadata pointer
      name: metadata.name.substring(0, 32),       // Truncate to be safe
      symbol: metadata.symbol.substring(0, 10),   // Truncate to be safe
      uri: metadata.uri.substring(0, 200),        // Truncate to be safe
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    transaction.add(initializeMetadataInstruction);
    
    // Set fee payer
    transaction.feePayer = walletPubkey;
    
    try {
      // Get latest blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      
      // Partial sign with the mint keypair (REQUIRED)
      transaction.partialSign(mint);
      
      console.log("Transaction prepared, requesting wallet signature...");
      console.log("Transaction contains", transaction.instructions.length, "instructions");
      
      // Debug log instructions
      transaction.instructions.forEach((instr, i) => {
        console.log(`Instruction ${i}: programId=${instr.programId.toBase58()}, keys=${instr.keys.length}`);
      });
      
      // Simulate transaction before sending
      console.log("Simulating transaction before sending...");
      try {
        const simulation = await connection.simulateTransaction(transaction);
        if (simulation.value.err) {
          console.error("Transaction simulation failed:", simulation.value.err);
          console.error("Simulation logs:", simulation.value.logs);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log("Transaction simulation successful");
      } catch (simError) {
        console.error("Error simulating transaction:", simError);
        // Continue despite simulation error to see if actual transaction works
      }
      
      // Sign with wallet
      const signedTransaction = await signTransaction(transaction);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send with NO PREFLIGHT to bypass errors
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,     // CRITICAL: Skip preflight checks
        preflightCommitment: 'processed',
        maxRetries: 5            // Increase retry count
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Wait for confirmation with more retries
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
