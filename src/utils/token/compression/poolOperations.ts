
import { 
  Connection, 
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID, TokenPoolResult } from '../types';
import { toast } from 'sonner';
import * as bs58 from 'bs58';
import { createTokenPool as lightCreateTokenPool } from '@lightprotocol/compressed-token';
import { poolService } from '@/lib/db';
import { getLightRpc } from '@/utils/compressionApi';
import { createLightSigner, LightSigner } from './signerAdapter';

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
    
    // Get Light Protocol RPC instance
    const lightRpc = getLightRpc();
    
    // Create a Light Protocol compatible signer using our adapter
    const lightSigner: LightSigner = createLightSigner(walletPubkey, signTransaction);
    
    console.log("Created light signer with public key:", lightSigner.publicKey.toString());
    
    // Use Light Protocol's createTokenPool function with Token-2022 program ID
    // Note the type assertion is necessary because our signer doesn't have a real secretKey
    // but Light Protocol doesn't actually use it in browser environments
    const txId = await lightCreateTokenPool(
      lightRpc,
      lightSigner as any, // Type assertion for Light Protocol compatibility
      mintPubkey,
      undefined, // Optional fee payer (undefined = use signer)
      TOKEN_2022_PROGRAM_ID // Using Token-2022 program
    );
    
    console.log('Token pool created with tx:', txId);
    
    // Wait for transaction confirmation with retries
    let confirmed = false;
    let retries = 0;
    const maxRetries = 5;
    
    while (!confirmed && retries < maxRetries) {
      try {
        const status = await connection.confirmTransaction({
          signature: txId,
          blockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }, 'confirmed');
        
        if (status.value.err) {
          throw new Error(`Transaction confirmed but failed: ${JSON.stringify(status.value.err)}`);
        }
        
        confirmed = true;
        console.log('Transaction confirmed successfully');
      } catch (error) {
        console.warn(`Confirmation attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          throw new Error(`Failed to confirm transaction after ${maxRetries} attempts`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    
    // Detailed error logging
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    
    // Improved error messaging
    let errorMessage = "Failed to create token pool";
    
    if (error.logs) {
      // Extract error from transaction logs
      errorMessage = `Transaction error: ${error.logs.join('\n')}`;
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
