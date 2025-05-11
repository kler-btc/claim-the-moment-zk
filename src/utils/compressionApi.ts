
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendOptions,
} from '@solana/web3.js';
import { toast } from 'sonner';

// Use Helius RPC endpoints for Light Protocol support
const NETWORK = 'devnet';
const HELIUS_API_KEY = '9aeaaaaa-ac88-42a4-8f49-7b0c23cee762'; // Devnet test key
const RPC_URL = `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Light Protocol endpoints
const LIGHT_COMPRESSION_ENDPOINT = RPC_URL;
const LIGHT_PROVER_ENDPOINT = RPC_URL;

/**
 * Get a Solana connection using Helius RPC with Light Protocol support
 */
export const getSolanaConnection = (): Connection => {
  console.log(`Creating connection to ${NETWORK} via ${RPC_URL}`);
  
  // Create connection with proper configuration for browser
  return new Connection(RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    wsEndpoint: `wss://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  });
};

/**
 * Get Light Protocol specific connection
 */
export const getLightConnection = (): Connection => {
  console.log('Creating Light Protocol connection');
  
  return getSolanaConnection();
};

/**
 * Get a Light Protocol RPC connection
 * This is for compatibility with Light Protocol SDK which might expect a different connection type
 */
export const getLightRpc = (): Connection => {
  return getLightConnection();
};

/**
 * Send transaction with automatic error handling
 * @returns Transaction signature if successful
 */
export const sendAndConfirmTransaction = async (
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  options?: SendOptions
): Promise<string> => {
  try {
    // Send the transaction with standard options
    const signature = await connection.sendTransaction(transaction, signers, options);
    
    // Wait for confirmation with improved error handling
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error('Error sending transaction:', error);
    
    // Improved error reporting
    if (error instanceof Error) {
      let errorMessage = error.message;
      
      // Extract more informative message if possible
      if (errorMessage.includes('Transaction simulation failed')) {
        errorMessage = 'Transaction simulation failed. This could be due to account size issues or insufficient SOL.';
      }
      
      toast.error('Transaction Failed', { 
        description: errorMessage 
      });
    }
    
    throw error;
  }
};

/**
 * Verify if a user has claimed a token for an event
 */
export const verifyTokenClaim = async (
  eventId: string,
  walletAddress: string
): Promise<boolean> => {
  // Import claimService from db to avoid circular imports
  const { claimService } = await import('@/lib/db');
  
  // Check if this wallet has claimed a token for this event
  return await claimService.hasWalletClaimedEvent(eventId, walletAddress);
};

// Export for convenience
export const getDevnetConnection = getSolanaConnection;
