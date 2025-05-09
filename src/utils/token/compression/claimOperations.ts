
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { toast } from 'sonner';
import { TOKEN_2022_PROGRAM_ID } from '../types';
import { createBuffer } from '../../buffer';

// On-demand claim a compressed token
export const claimCompressedToken = async (
  eventId: string,
  recipientWallet: string,
  connection?: Connection,
  signTransaction?: SignerWalletAdapter['signTransaction']
): Promise<boolean> => {
  try {
    console.log(`Claiming compressed token for event ${eventId} to wallet ${recipientWallet}`);
    
    // Get the event data
    const eventDataKey = `event-${eventId}`;
    const eventDataStr = localStorage.getItem(eventDataKey);
    
    if (!eventDataStr) {
      throw new Error(`Event ${eventId} not found`);
    }
    
    const eventData = JSON.parse(eventDataStr);
    const mintAddress = eventData.mintAddress;
    
    // Get the token pool data
    const poolStorageKey = `pool-${mintAddress}`;
    const poolDataStr = localStorage.getItem(poolStorageKey);
    
    if (!poolDataStr) {
      throw new Error(`Token pool for ${mintAddress} not found. Please ensure the event has a token pool created.`);
    }
    
    const poolData = JSON.parse(poolDataStr);
    const poolAddress = poolData.poolAddress;
    
    // Get or initialize claims array for this event
    const claimsKey = `claims-${eventId}`;
    const existingClaims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    
    // Check if this wallet has already claimed
    if (existingClaims.includes(recipientWallet)) {
      throw new Error('You have already claimed a token for this event');
    }
    
    // In a real implementation with a connected wallet, we would create and send a transaction:
    if (connection && signTransaction) {
      // 1. Create a transaction to mint a compressed token directly to the recipient
      const mintPubkey = new PublicKey(mintAddress);
      const recipientPubkey = new PublicKey(recipientWallet);
      const poolPubkey = new PublicKey(poolAddress);
      
      // Create a claim instruction (simplified version of Light Protocol's API)
      const claimInstruction = new TransactionInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [
          { pubkey: poolPubkey, isSigner: false, isWritable: true },
          { pubkey: mintPubkey, isSigner: false, isWritable: true },
          { pubkey: recipientPubkey, isSigner: false, isWritable: true },
          // Creator wallet would be needed here in a real implementation
        ],
        data: createBuffer(Buffer.from([0x08, 0x01])) // Fake instruction code for demo
      });
      
      const tx = new Transaction().add(claimInstruction);
      
      // Sign and send the transaction
      // Additional code would be needed here for real implementation
      
      console.log('Claim transaction would be sent here in a real implementation');
    }
    
    // For our demo, we'll simulate a successful claim by storing in localStorage
    existingClaims.push(recipientWallet);
    localStorage.setItem(claimsKey, JSON.stringify(existingClaims));
    
    console.log(`Token claimed successfully for ${recipientWallet}`);
    
    toast.success("Token Claimed Successfully", {
      description: "You have successfully claimed the compressed token for this event."
    });
    
    return true;
  } catch (error) {
    console.error('Error claiming compressed token:', error);
    toast.error("Error Claiming Token", {
      description: error instanceof Error ? error.message : "Failed to claim token"
    });
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
