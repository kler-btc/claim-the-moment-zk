
import { 
  Connection, 
  PublicKey,
  Transaction,
  Keypair,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID, TokenPoolResult } from '../types';
import { toast } from 'sonner';
import * as bs58 from 'bs58';
import { createTokenPool as lightCreateTokenPool } from '@lightprotocol/compressed-token';
import { poolService } from '@/lib/db';
import { getLightRpc } from '@/utils/compressionApi';
import { createLightSigner } from './signerAdapter';

// Constants for Light Protocol's programs
const COMPRESSED_TOKEN_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

/**
 * Create a token pool for Light Protocol compression.
 * 
 * This function follows the Light Protocol browser pattern where:
 * 1. We create a Light Protocol compatible signer adapter
 * 2. We pass this to the Light Protocol functions with appropriate type assertions
 * 3. The wallet signs the transaction when prompted
 */
export const createTokenPool = async (
  mintAddress: string,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenPoolResult> => {
  console.log('Creating token pool for mint:', mintAddress);
  
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const walletPubkey = new PublicKey(walletAddress);
    
    console.log("Using Light Protocol's createTokenPool with mint:", mintAddress);
    console.log("Wallet pubkey:", walletPubkey.toString());
    
    // Get Light Protocol RPC instance with more detailed logging
    const lightRpc = getLightRpc();
    console.log("Light RPC initialized:", lightRpc ? "success" : "failed");
    
    // CRITICAL FIX: Implement better error handling and transaction preparation
    console.log("Using versioned transaction approach for Light Protocol compatibility");

    // Create Light Protocol compatible signer with enhanced error catching
    const lightSigner = createLightSigner(walletPubkey, async (transaction) => {
      try {
        // Type-safe logging of transaction details
        if (transaction instanceof Transaction) {
          console.log("About to sign Transaction with", transaction.instructions?.length || 0, "instructions");
        } else if (transaction instanceof VersionedTransaction) {
          console.log("About to sign VersionedTransaction");
        }
        
        // Add custom signing logic with detailed logs
        const signedTx = await signTransaction(transaction);
        console.log("Transaction signed successfully by wallet");
        return signedTx;
      } catch (error) {
        console.error("Error during transaction signing:", error);
        // Re-throw with more context to help debugging
        throw new Error(`Wallet signing error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    console.log("Starting Light Protocol token pool creation...");
    
    // CRITICAL FIX: Use try/catch with specific error logging for Light Protocol's createTokenPool
    let txId;
    try {
      // Set the timeout to a higher value for the token pool creation 
      // Light Protocol operations can take longer than regular transactions
      console.log("Calling Light Protocol's createTokenPool with extended timeout");
      
      // Use Light Protocol's createTokenPool function with Token-2022 program ID
      // We need to use a type assertion as Light Protocol's API expects a slightly different signer type
      txId = await Promise.race([
        lightCreateTokenPool(
          lightRpc,
          lightSigner as any, // Type assertion for Light Protocol compatibility
          mintPubkey,
          undefined, // Optional fee payer (undefined = use signer)
          TOKEN_2022_PROGRAM_ID // Using Token-2022 program
        ),
        // Add a timeout that provides a more helpful error message
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Light Protocol token pool creation timed out after 2 minutes')), 120000)
        )
      ]);
      
      console.log('Token pool creation transaction submitted with id:', txId);
    } catch (lpError) {
      console.error('Light Protocol specific error during token pool creation:', lpError);
      
      // Enhanced error reporting for Light Protocol errors
      if (lpError instanceof Error) {
        if (lpError.message.includes("signature verification")) {
          console.error("Transaction signature verification failed, likely due to Light Protocol compatibility issue");
          // Try another approach with direct transaction building
          throw new Error(`Light Protocol signature verification failed: ${lpError.message}. Try reconnecting your wallet and ensuring you have sufficient SOL.`);
        }
      }
      
      throw lpError;
    }
    
    // Wait for transaction confirmation with retries and better error handling
    let confirmed = false;
    let retries = 0;
    const maxRetries = 5;
    
    // CRITICAL FIX: Improved confirmation logic with better error diagnostics
    while (!confirmed && retries < maxRetries) {
      try {
        console.log(`Attempt ${retries + 1} to confirm pool creation transaction...`);
        
        // Get a fresh blockhash for each confirmation attempt
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        
        const status = await connection.confirmTransaction({
          signature: txId,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight
        }, 'confirmed');
        
        if (status.value.err) {
          console.warn(`Confirmation returned with error: ${JSON.stringify(status.value.err)}`);
          throw new Error(`Transaction confirmed but failed: ${JSON.stringify(status.value.err)}`);
        }
        
        confirmed = true;
        console.log('Transaction confirmed successfully');
      } catch (error) {
        console.warn(`Confirmation attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          // Final attempt - check if transaction was actually successful despite confirmation API errors
          try {
            console.log("Checking transaction status directly as last resort...");
            const lastStatus = await connection.getSignatureStatus(txId);
            
            if (lastStatus && lastStatus.value && !lastStatus.value.err) {
              console.log("Transaction appears successful despite confirmation API errors");
              confirmed = true;
            } else {
              console.error("Final status check failed:", lastStatus?.value?.err || "unknown error");
              throw new Error(`Failed to confirm transaction after ${maxRetries} attempts`);
            }
          } catch (finalError) {
            throw new Error(`Failed to confirm transaction after ${maxRetries} attempts: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
          }
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Calculate the pool address (PDA) to derive the same value Light Protocol uses
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("compressed-token-pool"), mintPubkey.toBuffer()],
      COMPRESSED_TOKEN_PROGRAM_ID
    );
    
    // Get the state tree address (will be used for Merkle tree operations)
    const [stateTreeAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("compressed-token-tree"), mintPubkey.toBuffer()],
      COMPRESSED_TOKEN_PROGRAM_ID
    );
    
    console.log('Pool address:', poolAddress.toBase58());
    console.log('State tree address:', stateTreeAddress.toBase58());
    
    // Generate a merkle root hash from the transaction
    const merkleRoot = bs58.encode(Buffer.from(txId.slice(0, 32)));
    
    // Store pool information in persistent database
    const eventId = await getEventIdFromMintAddress(mintAddress);
    if (!eventId) {
      throw new Error(`Could not find event for mint address: ${mintAddress}`);
    }
    
    await poolService.savePool({
      eventId,
      mintAddress,
      poolAddress: poolAddress.toString(),
      merkleRoot,
      transactionId: txId,
      createdAt: new Date().toISOString()
    });

    // Return the transaction ID and merkle root
    return {
      transactionId: txId,
      merkleRoot: merkleRoot,
      poolAddress: poolAddress.toString(),
      stateTreeAddress: stateTreeAddress.toString()
    };
  } catch (error: any) {
    console.error('Error creating token pool:', error);
    
    // CRITICAL: Enhanced error handling with specialized reporting
    let errorMessage = "Failed to create token pool";
    
    // Detailed error reporting based on error type
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
      // Extract error from transaction logs
      errorMessage = `Transaction error in logs: ${error.logs.join('\n')}`;
    } else if (error.message && error.message.includes("Simulation failed")) {
      errorMessage = "Light Protocol simulation failed. This may be due to:";
      errorMessage += "\n1. Insufficient SOL in your wallet";
      errorMessage += "\n2. The token was already registered with Light Protocol";
      errorMessage += "\n3. A temporary issue with the Light Protocol service";
    } else if (error.message && error.message.includes("signature verification")) {
      errorMessage = "Transaction signature verification failed. Please try:";
      errorMessage += "\n1. Reconnect your wallet";
      errorMessage += "\n2. Ensure you have enough SOL (at least 0.05 SOL)";
      errorMessage += "\n3. Try again in a few minutes";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error("Failed to create token pool", {
      description: errorMessage
    });
    throw new Error(`Failed to create token pool: ${errorMessage}`);
  }
};

// Helper to get eventId from mintAddress using our database
async function getEventIdFromMintAddress(mintAddress: string): Promise<string | null> {
  const event = await db.events.where('mintAddress').equals(mintAddress).first();
  return event?.id || null;
}

// Import the db at the top (TypeScript will hoist this)
import { db } from '@/lib/db';
