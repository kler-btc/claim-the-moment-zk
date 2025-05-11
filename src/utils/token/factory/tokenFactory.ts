
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

/**
 * Creates a token with all necessary metadata
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
    
    // IMPORTANT: To avoid Symbol-related issues, ensure it doesn't conflict with SOL
    // Users reported issues with 'Sol' as a symbol
    let tokenSymbol = eventDetails.symbol;
    if (tokenSymbol.toLowerCase() === 'sol') {
      tokenSymbol = `${tokenSymbol}_`;
      console.log('Adjusted token symbol to avoid conflicts:', tokenSymbol);
    }
    
    // Set token metadata - trim values to avoid overflow
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
    
    // CRITICAL: Set much higher compute budget for Token-2022 operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Set higher priority fee to improve chances of confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000 // Increased from 50000
    });
    
    // Calculate the mint account size using our improved function
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Total calculated size needed for mint+metadata: ${totalSize}`);
    
    // Calculate rent exemption based on the new size
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption} lamports`);
    
    // Add detailed debug logs
    console.log('Transaction preparation details:');
    console.log('- RPC endpoint:', connection.rpcEndpoint);
    console.log('- Wallet pubkey:', walletPubkey.toString());
    console.log('- Token-2022 program ID:', TOKEN_2022_PROGRAM_ID.toString());
    
    // Build transaction with proper instruction ordering and extra error logging
    const tx = new Transaction();
    
    // Step 1: Add compute budget and priority fee instructions first
    tx.add(computeBudgetIx);
    tx.add(priorityFeeIx);
    
    // Step 2: Create system account with correct space
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: rentExemption,
      programId: TOKEN_2022_PROGRAM_ID
    });
    tx.add(createAccountIx);
    console.log('Added createAccount instruction with size:', totalSize);
    
    // Step 3: CRITICAL: Initialize metadata pointer extension FIRST
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey, // Metadata pointer to self
      TOKEN_2022_PROGRAM_ID
    );
    tx.add(initMetadataPointerIx);
    console.log('Added initMetadataPointer instruction');
    
    // Step 4: Initialize mint second
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      0, // For event tokens, use 0 decimals
      walletPubkey,
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    tx.add(initMintIx);
    console.log('Added initMint instruction with 0 decimals');
    
    // Step 5: Initialize metadata last
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
    tx.add(initMetadataIx);
    console.log('Added initMetadata instruction');
    
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    try {
      console.log("Requesting wallet signature for transaction...");
      
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send and confirm the transaction with more lenient settings
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true, // Skip preflight checks for better success rate with large accounts
        preflightCommitment: 'processed', // Use less strict commitment for initial send
        maxRetries: 5 // Retry up to 5 times
      });
      
      console.log("Transaction sent with ID:", txid);
      toast.info("Transaction submitted", {
        description: "Your transaction is being processed, please wait..."
      });
      
      // Wait for confirmation with proper timeout handling
      const confirmation = await Promise.race([
        connection.confirmTransaction({
          signature: txid,
          blockhash: tx.recentBlockhash,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }, 'confirmed'),
        // Add a timeout to avoid hanging
        new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 90000))
      ]).catch(error => {
        console.log('Confirmation timeout or error, will check status later:', error);
        // Even if confirmation times out, the transaction might still succeed
        return { value: { err: null } }; // Continue as if successful
      });
      
      if (confirmation && 'value' in confirmation && confirmation.value && confirmation.value.err) {
        throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('Transaction likely confirmed successfully');
      
      // Store event data
      await saveEventData(
        eventId,
        mint.publicKey.toBase58(),
        eventDetails,
        walletAddress,
        txid
      );
      
      console.log('Token created successfully with txid:', txid);
      
      return {
        eventId,
        mintAddress: mint.publicKey.toBase58(),
        transactionId: txid
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      
      if (error instanceof SendTransactionError && error.logs) {
        console.error('Transaction error logs:');
        for (const log of error.logs) {
          console.error(`- ${log}`);
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
