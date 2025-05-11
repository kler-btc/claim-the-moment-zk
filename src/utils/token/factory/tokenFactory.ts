
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
    const walletPubkey = new PublicKey(walletAddress);
    
    // CRITICAL: Set higher compute budget for Token-2022 operations
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Set higher priority fee to improve chances of confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000
    });
    
    // Calculate the mint account size using our improved function
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Total calculated size needed for mint+metadata: ${totalSize}`);
    
    // Calculate rent exemption based on the new size
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption} lamports`);
    
    // Build transaction with proper instruction ordering
    const tx = new Transaction().add(
      // 1. Set compute budget first
      computeBudgetIx,
      priorityFeeIx,
      
      // 2. Create system account with correct space
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mint.publicKey,
        space: totalSize,
        lamports: rentExemption, // Exact rent exemption needed
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
    );
    
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    try {
      console.log("Requesting wallet signature for transaction...");
      
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send and confirm the transaction
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true, // Skip preflight to avoid simulation errors with large accounts
        preflightCommitment: 'confirmed'
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Wait for confirmation with proper timeout handling
      const confirmation = await connection.confirmTransaction({
        signature: txid,
        blockhash: tx.recentBlockhash,
        lastValidBlockHeight: (await connection.getBlockHeight()) + 150
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('Transaction confirmed successfully');
      
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
        console.error('Transaction error logs:', error.logs);
        
        // Extract specific error information from logs
        for (const log of error.logs) {
          console.error('Log:', log);
        }
        
        // Look for InvalidAccountData errors which often indicate sizing issues
        if (error.logs.some(log => log.includes('InvalidAccountData'))) {
          throw new Error('Token creation failed: Invalid account data error. This might be due to incorrect account size calculation.');
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
