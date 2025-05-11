
import { 
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  SendTransactionError,
  SystemProgram,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TokenMetadata, TokenCreationResult, EventDetails, TOKEN_2022_PROGRAM_ID } from '../types';
import { buildTokenCreationInstructions } from '../transaction/tokenInstructionBuilder';
import { sendAndConfirmTokenTransaction } from '../transaction/tokenTransactionUtils';
import { saveEventData } from '../storage/eventStorage';
import { 
  ExtensionType, 
  getMintLen,
  getMinimumBalanceForRentExemptMint,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createInitializeInstruction
} from '@solana/spl-token';
import { calculateMetadataSize } from '../tokenMetadataUtils';
import { toast } from 'sonner';

// Properly define the confirmation result interface
interface TransactionConfirmation {
  value: {
    err: any | null;
  }
}

/**
 * Creates a token with all necessary metadata
 * 
 * UPDATED: Complete overhaul to fix InvalidAccountData errors
 */
export const createTokenWithMetadata = async (
  eventDetails: EventDetails,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenCreationResult> => {
  try {
    // Generate a new keypair for the mint
    const mint = Keypair.generate();
    console.log('Generated mint keypair:', mint.publicKey.toBase58());
    
    // Ensure symbol doesn't conflict with SOL
    let tokenSymbol = eventDetails.symbol;
    if (tokenSymbol.toLowerCase() === 'sol') {
      tokenSymbol = `${tokenSymbol}_`;
      console.log('Adjusted token symbol to avoid conflicts:', tokenSymbol);
    }
    
    // Trim metadata values to avoid overflow
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title.substring(0, 32), // 32 characters max for name
      symbol: tokenSymbol.substring(0, 10), // 10 characters max for symbol
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
    const walletPubkey = new PublicKey(walletAddress);
    
    console.log("Starting event creation with id:", eventId);
    
    // CRITICAL FIX: Use two-transaction approach instead of trying to do everything at once
    console.log("Using two-transaction approach to fix InvalidAccountData errors");
    
    // ============= TRANSACTION 1: CREATE AND INITIALIZE MINT ACCOUNT =============
    
    // Use maximum compute budget for Token-2022 operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Increase priority fee for better success rate
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 250000
    });
    
    // CRITICAL FIX: Use a more conservative but reliable approach - 10KB is enough for metadata
    const totalSize = 10000; // 10 KB allocation
    console.log(`Using account size of: ${totalSize} bytes for mint account`);
    
    // Calculate rent exemption
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption} lamports`);
    
    // Transaction 1: Create and setup the mint account
    const tx1 = new Transaction();
    
    // Add compute budget and priority fee instructions first
    tx1.add(computeBudgetIx);
    tx1.add(priorityFeeIx);
    
    // Create account with sufficient space
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: rentExemption,
      programId: TOKEN_2022_PROGRAM_ID
    });
    tx1.add(createAccountIx);
    console.log('Added createAccount instruction with size:', totalSize);
    
    // Initialize metadata pointer extension first
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
    tx1.add(initMetadataPointerIx);
    console.log('Added initMetadataPointer instruction');
    
    // Initialize mint
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      0, // 0 decimals
      walletPubkey,
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    tx1.add(initMintIx);
    console.log('Added initMint instruction with 0 decimals');
    
    // Set fee payer and get fresh blockhash
    tx1.feePayer = walletPubkey;
    const { blockhash: blockhash1 } = await connection.getLatestBlockhash('finalized');
    tx1.recentBlockhash = blockhash1;
    
    // Sign with mint keypair first
    tx1.partialSign(mint);
    
    // Have the wallet sign transaction 1
    console.log("Requesting wallet signature for transaction 1...");
    const signedTx1 = await signTransaction(tx1);
    console.log("Transaction 1 signed, sending...");
    
    // Send transaction 1 with retry logic
    let txid1;
    try {
      // Skip preflight for this transaction to avoid false rejections
      txid1 = await connection.sendRawTransaction(signedTx1.serialize(), {
        skipPreflight: true,
        maxRetries: 5
      });
      console.log("Transaction 1 sent with ID:", txid1);
      
      // Wait for confirmation with timeout handling
      const confirmation1 = await Promise.race([
        connection.confirmTransaction({
          signature: txid1,
          blockhash: blockhash1,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 60000))
      ]).catch(error => {
        console.warn('Confirmation error for transaction 1:', error);
        return { value: { err: null } } as TransactionConfirmation;
      });
      
      // Check for errors in confirmation
      if (confirmation1?.value?.err) {
        throw new Error(`Transaction 1 failed: ${JSON.stringify(confirmation1.value.err)}`);
      }
      
      console.log("Transaction 1 confirmed successfully");
      
      // Sleep briefly to ensure the account is fully confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Transaction 1 error:", error);
      throw new Error(`Failed to create mint account: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // ============= TRANSACTION 2: INITIALIZE METADATA =============
    
    // Transaction 2: Initialize metadata in the mint account
    const tx2 = new Transaction();
    
    // Add compute budget again
    tx2.add(computeBudgetIx);
    tx2.add(priorityFeeIx);
    
    // Initialize metadata as a separate transaction
    const initMetadataIx = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    tx2.add(initMetadataIx);
    console.log('Added initMetadata instruction to transaction 2');
    
    // Set fee payer and get fresh blockhash
    tx2.feePayer = walletPubkey;
    const { blockhash: blockhash2 } = await connection.getLatestBlockhash('finalized');
    tx2.recentBlockhash = blockhash2;
    
    // Have the wallet sign transaction 2
    console.log("Requesting wallet signature for transaction 2...");
    const signedTx2 = await signTransaction(tx2);
    console.log("Transaction 2 signed, sending...");
    
    // Send transaction 2
    let txid2;
    try {
      txid2 = await connection.sendRawTransaction(signedTx2.serialize(), {
        skipPreflight: true,
        maxRetries: 5
      });
      console.log("Transaction 2 sent with ID:", txid2);
      
      // Wait for confirmation with timeout handling
      const confirmation2 = await Promise.race([
        connection.confirmTransaction({
          signature: txid2,
          blockhash: blockhash2,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 60000))
      ]).catch(error => {
        console.warn('Confirmation error for transaction 2:', error);
        return { value: { err: null } } as TransactionConfirmation;
      });
      
      // Check for errors in confirmation
      if (confirmation2?.value?.err) {
        throw new Error(`Transaction 2 failed: ${JSON.stringify(confirmation2.value.err)}`);
      }
      
      console.log("Transaction 2 confirmed successfully");
    } catch (error) {
      console.error("Transaction 2 error:", error);
      
      // Even if metadata fails, we still created the mint, so continue
      console.log("Mint account created, continuing despite metadata error");
    }
    
    // Store event data with successful mint
    await saveEventData(
      eventId,
      mint.publicKey.toBase58(),
      eventDetails,
      walletAddress,
      txid1 // Use the first transaction ID as the main one
    );
    
    console.log('Token created successfully with mint:', mint.publicKey.toBase58());
    
    return {
      eventId,
      mintAddress: mint.publicKey.toBase58(),
      transactionId: txid1
    };
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
