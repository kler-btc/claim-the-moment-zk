
import { PublicKey, Signer, Transaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Creates a Light Protocol compatible signer from a wallet adapter's signTransaction function
 * and a public key.
 * 
 * IMPROVED VERSION: Adds better error handling and transaction logging to help diagnose
 * signature verification failures in Light Protocol.
 */
export const createLightSigner = (
  walletPubkey: PublicKey,
  signTransaction: SignerWalletAdapter['signTransaction']
): LightSigner => {
  return {
    publicKey: walletPubkey,
    signTransaction: async (transaction: Transaction) => {
      try {
        // Add transaction inspection before signing
        console.log("Transaction to sign:", {
          feePayer: transaction.feePayer?.toBase58(),
          recentBlockhash: transaction.recentBlockhash || 'none',
          instructions: transaction.instructions.length
        });
        
        // Let the wallet sign the transaction
        const signedTx = await signTransaction(transaction);
        
        // Verify the signatures after wallet signing
        if (!transaction.verifySignatures()) {
          console.warn("Transaction signature verification failed after wallet signing");
        } else {
          console.log("Transaction signatures verified successfully");
        }
        
        return signedTx;
      } catch (error) {
        console.error("Error in Light Protocol signer during signing:", error);
        throw error; // Re-throw to allow proper error handling
      }
    },
    // Add a dummy secretKey that satisfies the Signer interface
    secretKey: new Uint8Array(64) // This won't be used in browser environments
  };
};

// Define our custom signer type that matches what Light Protocol expects in browser
export interface LightSigner {
  publicKey: PublicKey;
  secretKey: Uint8Array; // Required by @solana/web3.js Signer type
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

// Ensure our LightSigner satisfies the Signer interface
export type BrowserCompatibleSigner = Signer & {
  signTransaction: SignerWalletAdapter['signTransaction'];
};
