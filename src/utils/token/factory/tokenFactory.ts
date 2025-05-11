
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
    
    // ===== CRITICAL FIX: Calculate rent BEFORE building instructions =====
    // For Token-2022, we need 3x the base size as default calculation is insufficient
    const baseSize = 82 + // Base mint account
                    34 + // Metadata pointer extension
                    32 + // Fixed metadata header
                    (metadata.name.length + 4) + // Name with length prefix
                    (metadata.symbol.length + 4) + // Symbol with length prefix
                    (metadata.uri.length + 4); // URI with length prefix
    
    // Much bigger buffer for Token-2022 metadata - this is crucial
    const totalSize = Math.max(baseSize * 3, 2048); // At least 2KB
    
    // Calculate rent with precise buffer
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Total size needed for mint: ${totalSize}`);
    console.log(`Required rent: ${rentExemption}, allocating: ${rentExemption * 2} lamports...`);
    
    // Now build instructions with the correct size information
    const instructions = buildTokenCreationInstructions(
      mint.publicKey, 
      walletPubkey, 
      metadata, 
      eventDetails.decimals || 0
    );
    
    // Set higher compute budget 
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000 // Maximum compute units
    });
    
    // Higher priority fee to help with transaction success
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100_000 // Higher priority fee
    });
    
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
      computeBudgetIx,
      priorityFeeIx,
      
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
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    try {
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send and confirm the transaction with skipPreflight = true
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        maxRetries: 3
      });
      
      // Wait for confirmation with proper timeout handling
      const status = await connection.confirmTransaction(
        {
          signature: txid,
          blockhash: tx.recentBlockhash as string,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        },
        'confirmed'
      );
      
      // Check for transaction errors - be extra careful with type checking
      if (status && 
          typeof status === 'object' && 
          'value' in status && 
          status.value && 
          typeof status.value === 'object' && 
          'err' in status.value && 
          status.value.err) {
        throw new Error(`Transaction confirmed but failed: ${JSON.stringify(status.value.err)}`);
      }
      
      console.log('Transaction confirmed successfully with txid:', txid);
      
      // Store event data
      await saveEventData(
        eventId,
        mint.publicKey.toBase58(),
        eventDetails,
        walletAddress,
        txid
      );
      
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
        let errorMessage = "Transaction failed";
        const relevantErrorLog = error.logs.find(log => 
          log.includes('Error') || 
          log.includes('failed') || 
          log.includes('InvalidAccountData')
        );
        
        if (relevantErrorLog) {
          errorMessage = relevantErrorLog;
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
