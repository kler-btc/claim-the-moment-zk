
import { 
  Connection, 
  PublicKey, 
  Transaction
} from '@solana/web3.js';
import { bn, Rpc } from '@lightprotocol/stateless.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
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
  return new Rpc(HELIUS_RPC_URL);
};

// Helper function to get validity proof
export const getValidityProof = async (
  connection: Connection,
  accountHash: string
): Promise<any> => {
  try {
    return await connection.getValidityProof([accountHash]);
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
