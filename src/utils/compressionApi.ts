
import { 
  Connection, 
  PublicKey
} from '@solana/web3.js';
import { Rpc } from '@lightprotocol/stateless.js';
import { toast } from '@/components/ui/use-toast';

// Helius API key for devnet
const HELIUS_API_KEY = '9aeaaaaa-ac88-42a4-8f49-7b0c23cee762';
export const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Create an RPC connection to Solana devnet via Helius
export const getSolanaConnection = (): Connection => {
  return new Connection(HELIUS_RPC_URL, 'confirmed');
};

// Create a Light Protocol RPC client
export const getLightRpc = (): Rpc => {
  // Creating an Rpc instance with required parameters
  // The constructor expects: endpoint, commitment, and apiVersion
  return new Rpc(
    HELIUS_RPC_URL,   // endpoint
    'confirmed',      // commitment
    '1.0.0'           // apiVersion (use appropriate version)
  );
};

// Simulate getting validity proof since getValidityProof is not available in Connection
export const getValidityProof = async (
  connection: Connection,
  accountHash: string,
  commitment?: string
): Promise<any> => {
  try {
    // This is a simulation - in a real implementation we would use the actual method
    console.log(`Simulating validity proof for account hash: ${accountHash}`);
    // In a real implementation, we would call the actual getValidityProof method
    // return await connection.getValidityProof([accountHash]);
    
    return {
      rootIndices: [0],
      compressedProof: new Uint8Array(32).fill(1)
    };
  } catch (error) {
    console.error('Error getting validity proof:', error);
    throw new Error(`Failed to get validity proof: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Check if a wallet has claimed a token for an event (using local storage for demo)
export const verifyTokenClaim = async (
  eventId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    // For demo purposes, we'll check local storage
    // In production, this would query Helius compression APIs
    const claimsKey = `claims-${eventId}`;
    const claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    return claims.includes(walletAddress);
  } catch (error) {
    console.error('Error verifying token claim:', error);
    return false;
  }
};
