
import { PublicKey } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Creates a Light Protocol compatible signer from a wallet adapter
 * 
 * This is crucial for browser environments where we don't have access to
 * the wallet's private key but need to create a signer that Light Protocol
 * functions can work with.
 */
export const createLightSigner = (
  walletPubkey: PublicKey,
  signTransaction: SignerWalletAdapter['signTransaction']
) => {
  // Create a browser-compatible signer that Light Protocol functions can use
  return {
    publicKey: walletPubkey,
    secretKey: new Uint8Array(64), // Dummy secretKey (not used in browser context)
    signTransaction: signTransaction
  };
};
