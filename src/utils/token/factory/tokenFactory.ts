
import { 
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  SendTransactionError
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TokenMetadata, TokenCreationResult, EventDetails } from '../types';
import { buildTokenCreationInstructions } from '../transaction/tokenInstructionBuilder';
import { sendAndConfirmTokenTransaction } from '../transaction/tokenTransactionUtils';
import { saveEventData } from '../storage/eventStorage';

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
    
    // Get the instructions for the transaction
    const instructions = buildTokenCreationInstructions(
      mint.publicKey, 
      walletPubkey, 
      metadata, 
      eventDetails.decimals || 0
    );
    
    // Calculate rent exemption with precise size
    const totalSize = instructions.createAccountIx.data.slice(4).readUInt32LE(4); // Extract size from instruction
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption}, allocating: ${rentExemption * 2} lamports`);
    
    // Update lamports value in createAccount instruction
    const updatedCreateAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: rentExemption * 2, // Double for safety
      programId: instructions.createAccountIx.programId
    });
    
    // Build transaction with precise instruction ordering
    const tx = new Transaction().add(
      // 1. Set compute budget first
      instructions.computeBudgetIx,
      instructions.priorityFeeIx,
      
      // 2. Create system account with correct space
      updatedCreateAccountIx,
      
      // 3. CRITICAL: Initialize metadata pointer extension FIRST
      instructions.initMetadataPointerIx,
      
      // 4. Initialize mint second
      instructions.initMintIx,
      
      // 5. Initialize metadata last
      instructions.initMetadataIx
    );
    
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    try {
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send and confirm the transaction
      const txid = await sendAndConfirmTokenTransaction(
        connection, 
        signedTransaction, 
        walletPubkey
      );
      
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
