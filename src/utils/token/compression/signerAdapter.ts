
import { PublicKey, Signer } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Creates a Light Protocol compatible signer from a wallet adapter's signTransaction function
 * and a public key.
 * 
 * Light Protocol in browser environments only needs:
 * 1. A publicKey property to derive addresses
 * 2. A signTransaction function to sign transactions
 * 
 * It doesn't actually use the secretKey in browser environments.
 */
export const createLightSigner = (
  walletPubkey: PublicKey,
  signTransaction: SignerWalletAdapter['signTransaction']
): LightSigner => {
  return {
    publicKey: walletPubkey,
    signTransaction,
    // Add a dummy secretKey that satisfies the Signer interface
    secretKey: new Uint8Array(64) // This won't be used in browser environments
  };
};

// Define our custom signer type that matches what Light Protocol expects in browser
export interface LightSigner {
  publicKey: PublicKey;
  secretKey: Uint8Array; // Required by @solana/web3.js Signer type
  signTransaction: SignerWalletAdapter['signTransaction'];
}

// Ensure our LightSigner satisfies the Signer interface
export type BrowserCompatibleSigner = Signer & {
  signTransaction: SignerWalletAdapter['signTransaction'];
};
