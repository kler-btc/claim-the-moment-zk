
import { 
  Connection, 
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID, TokenPoolResult } from '../types';
import { createBuffer } from '../../buffer';
import { toast } from 'sonner';
import * as bs58 from 'bs58';
import { createTokenPool as lightCreateTokenPool } from '@lightprotocol/compressed-token';
import { poolService } from '@/lib/db';
import { getLightRpc } from '@/utils/compressionApi';
import { createLightSigner } from './signerAdapter';

// Constants for Light Protocol's programs
const LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

// Create a token pool for Light Protocol compression
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
    
    // Get Light Protocol RPC instance
    const lightRpc = getLightRpc();
    
    // Create a Light Protocol compatible signer
    const lightSigner = createLightSigner(walletPubkey, signTransaction);
    
    // Use Light Protocol's createTokenPool function with explicit type assertion
    // We know our adapter works with Light Protocol at runtime, but TypeScript doesn't know
    // about the expected shape, so we use an assertion
    const txId = await lightCreateTokenPool(
      lightRpc,
      lightSigner as any, // Type assertion for Light Protocol compatibility
      mintPubkey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log('Token pool created with tx:', txId);
    
    // Wait for transaction confirmation using a simple approach
    await connection.confirmTransaction(txId, 'confirmed');
    
    // Calculate the pool address (PDA) to derive the same value Light Protocol uses
    const [poolAddress] = await PublicKey.findProgramAddressSync(
      [Buffer.from("compressed-token-pool"), mintPubkey.toBuffer()],
      LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID
    );
    
    // Get the state tree address (will be used for Merkle tree operations)
    const [stateTreeAddress] = await PublicKey.findProgramAddressSync(
      [Buffer.from("compressed-token-tree"), mintPubkey.toBuffer()],
      LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID
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
    
    // Improved error messaging
    let errorMessage = "Make sure you have enough SOL in your wallet and try again";
    
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
