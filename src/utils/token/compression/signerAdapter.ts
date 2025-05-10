
import { PublicKey, Transaction, Keypair, VersionedTransaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Light Protocol expects a Signer object with specific properties.
 * This adapter converts our wallet adapter to their expected format.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  // Light Protocol uses either signAllTransactions or signTransaction
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  // Adding secretKey as an optional property to match Signer interface
  secretKey?: Uint8Array;
}

/**
 * Creates a Light Protocol compatible signer from a wallet adapter
 * This creates a special adapter that works with Light Protocol functions
 * by providing necessary compatibility properties
 */
export const createLightSigner = (
  publicKey: PublicKey,
  signTransaction: SignerWalletAdapter['signTransaction']
): LightProtocolSigner => {
  return {
    publicKey,
    // Provide the signTransaction method that Light Protocol expects
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      return await signTransaction(tx) as T;
    },
    // Provide the signAllTransactions method that Light Protocol expects
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      // Sign transactions one by one using our signTransaction function
      const signedTxs: T[] = [];
      for (const tx of txs) {
        const signedTx = await signTransaction(tx) as T;
        signedTxs.push(signedTx);
      }
      return signedTxs;
    },
    // Add a dummy secretKey property that satisfies the type but is never used
    // Note: This is a workaround for type compatibility only
    // Light Protocol actually uses the signTransaction function for web wallets
    secretKey: undefined
  };
};
