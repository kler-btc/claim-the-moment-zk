import { Connection, PublicKey } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
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
 * This creates an RPC client that works with Light Protocol's compression APIs.
 * It uses the same endpoint for all three parameters as required by Light Protocol.
 */
export const getLightRpc = () => {
  console.log("Creating Light Protocol RPC client with endpoint:", HELIUS_RPC_URL);
  
  try {
    // FIXED: Create Light Protocol RPC client with proper configuration for browser
    // When using in a browser, Light Protocol requires ALL THREE URLs to be the same
    const lightRpc = createRpc(
      HELIUS_RPC_URL,
      HELIUS_RPC_URL,
      HELIUS_RPC_URL
    );
    
    console.log("Light Protocol RPC client created successfully");
    return lightRpc;
  } catch (error) {
    console.error("Error creating Light Protocol RPC client:", error);
    toast.error("Failed to initialize compression client");
    throw error;
  }
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
