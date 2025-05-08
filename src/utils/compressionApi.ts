
import { 
  Connection, 
  PublicKey
} from '@solana/web3.js';
import { Rpc } from '@lightprotocol/stateless.js';
import { toast } from 'sonner';

// Helius API key for devnet (replace with your actual key)
const HELIUS_API_KEY = '9aeaaaaa-ac88-42a4-8f49-7b0c23cee762';
export const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Create an RPC connection to Solana devnet via Helius
export const getSolanaConnection = (): Connection => {
  return new Connection(HELIUS_RPC_URL, 'confirmed');
};

// Create a Light Protocol RPC client
export const getLightRpc = (): Rpc => {
  console.log("Creating Light Protocol RPC client with endpoint:", HELIUS_RPC_URL);
  
  // Create Rpc instance with required parameters
  return new Rpc(
    HELIUS_RPC_URL,   // endpoint
    'confirmed',      // commitment
    '1.0.0',          // apiVersion
    {                 // additional config
      wsEndpoint: `wss://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    }
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
    
    // Real implementation using Light Protocol API
    const proofRequest = {
      hash: accountHash,
      commitment
    };
    
    // Make RPC call to get proof
    const response = await connection.getAccountInfo(new PublicKey(accountHash));
    
    // For now, return a simulated proof structure
    // In production, this would be returned from the actual RPC call
    return {
      rootIndices: [0],
      compressedProof: new Uint8Array(32).fill(1)
    };
  } catch (error) {
    console.error('Error getting validity proof:', error);
    throw new Error(`Failed to get validity proof: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Check if a wallet has claimed a token for an event
export const verifyTokenClaim = async (
  eventId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    // For demo, we'll check local storage
    // In production, this would query blockchain data
    const claimsKey = `claims-${eventId}`;
    const claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    return claims.includes(walletAddress);
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
    
    // Real implementation would query the actual state tree
    const stateTreePubkey = new PublicKey(stateTreeAddress);
    const accountInfo = await connection.getAccountInfo(stateTreePubkey);
    
    if (!accountInfo) {
      throw new Error(`State tree account not found: ${stateTreeAddress}`);
    }
    
    // In production, we would parse the account data to extract tree info
    // For now, return simulated data
    return {
      treeHeight: 20,
      leafCount: 0,
      rootHash: `root-${Date.now().toString(36)}`
    };
  } catch (error) {
    console.error('Error getting merkle tree state:', error);
    throw new Error(`Failed to get merkle tree state: ${error instanceof Error ? error.message : String(error)}`);
  }
};
