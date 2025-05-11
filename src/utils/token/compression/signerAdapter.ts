
import { PublicKey } from '@solana/web3.js';
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
) => {
  return {
    publicKey: walletPubkey,
    signTransaction
  };
};

export type LightSigner = ReturnType<typeof createLightSigner>;

// Browser-compatible signer interface for Light Protocol
export interface BrowserSigner {
  publicKey: PublicKey;
  signTransaction: SignerWalletAdapter['signTransaction'];
}
