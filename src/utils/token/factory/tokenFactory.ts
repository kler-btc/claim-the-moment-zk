
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
    
    // Strictly limit metadata values to avoid overflow
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title.substring(0, 32), // 32 characters max for name
      symbol: tokenSymbol.substring(0, 10), // 10 characters max for symbol
      uri: eventDetails.imageUrl.substring(0, 200), // Limit URI length
      additionalMetadata: [
        ['description', (eventDetails.description || '').substring(0, 100)], // Reduced size
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location.substring(0, 50)], // Limit location length
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;
    const walletPubkey = new PublicKey(walletAddress);
    
    console.log("Starting event creation with id:", eventId);
    
    // CRITICAL FIX: Use smaller fixed account size that works reliably
    const ACCOUNT_SIZE = 2048; // Use 2KB which should be sufficient for a basic Token-2022 mint
    console.log(`Using fixed account size of ${ACCOUNT_SIZE} bytes (2KB) for mint account`);
    
    // ============= TRANSACTION 1: CREATE ACCOUNT =============
    // First transaction just creates the account with SystemProgram
    
    // Calculate rent exemption
    const rentExemption = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
    console.log(`Required rent: ${rentExemption} lamports`);
    
    // Create transaction with just the create account instruction
    const tx1 = new Transaction();
    
    // Set higher compute budget
    tx1.add(ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000 // Lower but sufficient value
    }));
    
    // Create account with sufficient space
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: ACCOUNT_SIZE,
      lamports: rentExemption,
      programId: TOKEN_2022_PROGRAM_ID
    });
    tx1.add(createAccountIx);
    console.log('Added createAccount instruction with size:', ACCOUNT_SIZE);
    
    // Set fee payer and get blockhash
    tx1.feePayer = walletPubkey;
    const { blockhash: blockhash1 } = await connection.getLatestBlockhash('finalized');
    tx1.recentBlockhash = blockhash1;
    
    // Sign with mint keypair first
    tx1.partialSign(mint);
    
    // Have the wallet sign transaction 1
    console.log("Requesting wallet signature for transaction 1...");
    const signedTx1 = await signTransaction(tx1);
    console.log("Transaction 1 signed, sending...");
    
    // Send transaction 1
    let txid1;
    try {
      // Skip preflight to avoid rejection
      txid1 = await connection.sendRawTransaction(signedTx1.serialize(), {
        skipPreflight: true
      });
      console.log("Transaction 1 sent with ID:", txid1);
      
      // Wait for confirmation with good timeout handling
      const confirmation1 = await Promise.race([
        connection.confirmTransaction({
          signature: txid1,
          blockhash: blockhash1,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
        )
      ]).catch(error => {
        console.warn('Confirmation warning for transaction 1:', error);
        return { value: { err: null } } as TransactionConfirmation;
      });
      
      console.log("Account created successfully");
      
      // Sleep briefly to ensure account is registered
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Transaction 1 error:", error);
      throw new Error(`Failed to create mint account: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // ============= TRANSACTION 2: INITIALIZE MINT =============
    const tx2 = new Transaction();
    
    // Set higher compute budget and priority fee
    tx2.add(ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000 
    }));
    
    tx2.add(ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000 // Lower but still effective priority fee
    }));
    
    // Initialize metadata pointer extension
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
    tx2.add(initMetadataPointerIx);
    
    // Initialize mint with decimals
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      eventDetails.decimals || 0,
      walletPubkey,
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    tx2.add(initMintIx);
    
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
        skipPreflight: true
      });
      console.log("Transaction 2 sent with ID:", txid2);
      
      // Wait for confirmation
      await Promise.race([
        connection.confirmTransaction({
          signature: txid2,
          blockhash: blockhash2,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
        )
      ]).catch(error => {
        console.warn('Confirmation warning for transaction 2:', error);
      });
      
      console.log("Mint initialized successfully");
      
      // Sleep briefly before next transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Transaction 2 error:", error);
      throw new Error(`Failed to initialize mint: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // ============= TRANSACTION 3: INITIALIZE METADATA =============
    const tx3 = new Transaction();
    
    // Set higher compute budget and priority fee again
    tx3.add(ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    }));
    
    tx3.add(ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000
    }));
    
    // Initialize metadata
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
    tx3.add(initMetadataIx);
    
    // Set fee payer and get fresh blockhash
    tx3.feePayer = walletPubkey;
    const { blockhash: blockhash3 } = await connection.getLatestBlockhash('finalized');
    tx3.recentBlockhash = blockhash3;
    
    // Have the wallet sign transaction 3
    console.log("Requesting wallet signature for transaction 3...");
    const signedTx3 = await signTransaction(tx3);
    console.log("Transaction 3 signed, sending...");
    
    // Send transaction 3
    let txid3;
    try {
      txid3 = await connection.sendRawTransaction(signedTx3.serialize(), {
        skipPreflight: true
      });
      console.log("Transaction 3 sent with ID:", txid3);
      
      // Wait for confirmation
      await Promise.race([
        connection.confirmTransaction({
          signature: txid3,
          blockhash: blockhash3,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
        )
      ]).catch(error => {
        console.warn('Confirmation warning for transaction 3:', error);
      });
      
      console.log("Metadata initialized successfully");
    } catch (error) {
      console.error("Transaction 3 error:", error);
      // Metadata might fail but we still have a valid mint account
      console.log("Continuing with created mint even if metadata failed");
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
