
import { Connection, PublicKey } from '@solana/web3.js';
import { createRpc as createLightRpc } from '@lightprotocol/stateless.js';
import { toast } from 'sonner';
import { claimService } from '@/lib/db';

// Helius API key for devnet (replace with your actual key)
const HELIUS_API_KEY = '9aeaaaaa-ac88-42a4-8f49-7b0c23cee762';
export const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Create a standard Solana connection
export const getSolanaConnection = (): Connection => {
  return new Connection(HELIUS_RPC_URL, 'confirmed');
};

/**
 * Create a Light Protocol RPC client
 * 
 * This uses the createRpc function from @lightprotocol/stateless.js which
 * is the correct way to initialize the RPC for browser environments.
 */
export const getLightRpc = () => {
  console.log("Creating Light Protocol RPC client with endpoint:", HELIUS_RPC_URL);
  
  return createLightRpc(
    HELIUS_RPC_URL,   // standard RPC endpoint
    HELIUS_RPC_URL,   // compression API endpoint (same as RPC for Helius)
    HELIUS_RPC_URL    // prover endpoint (same as RPC for Helius)
  );
};

// Get validity proof for compressed accounts
export const getValidityProof = async (
  connection: Connection,
  accountHash: string,
  commitment: string = 'confirmed'
): Promise<any> => {
  try {
    console.log(`Getting validity proof for account hash: ${accountHash}`);
    
    // Use Light's getValidityProof API
    const response = await connection.getAccountInfo(new PublicKey(accountHash));
    
    if (!response) {
      throw new Error(`No account found for hash: ${accountHash}`);
    }
    
    // Extract the compressed proof data (simplified for demo)
    // In production, we would parse the account data correctly
    return {
      rootIndices: [0],
      compressedProof: response.data.slice(0, 32)
    };
  } catch (error) {
    console.error('Error getting validity proof:', error);
    throw new Error(`Failed to get validity proof: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Check if a wallet has claimed a token for an event using our database
export const verifyTokenClaim = async (
  eventId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    return await claimService.hasWalletClaimedEvent(eventId, walletAddress);
  } catch (error) {
    console.error('Error verifying token claim:', error);
    return false;
  }
};

// Get the current Light Protocol merkle tree state
export const getMerkleTreeState = async (
  connection: Connection,
  stateTreeAddress: string
): Promise<any> => {
  try {
    console.log(`Getting merkle tree state for: ${stateTreeAddress}`);
    
    // Get the actual state tree account
    const stateTreePubkey = new PublicKey(stateTreeAddress);
    const accountInfo = await connection.getAccountInfo(stateTreePubkey);
    
    if (!accountInfo) {
      throw new Error(`State tree account not found: ${stateTreeAddress}`);
    }
    
    // In production, parse the account data according to Light Protocol's format
    // This is simplified for the demo
    return {
      treeHeight: 20,
      leafCount: accountInfo.data.length > 8 ? accountInfo.data.readUInt32LE(0) : 0,
      rootHash: `root-${Date.now().toString(36)}`
    };
  } catch (error) {
    console.error('Error getting merkle tree state:', error);
    throw new Error(`Failed to get merkle tree state: ${error instanceof Error ? error.message : String(error)}`);
  }
};
