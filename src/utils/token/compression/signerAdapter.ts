
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
  // Adding secretKey as a required property to match Signer interface
  secretKey: Uint8Array;
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
  // Create a dummy secretKey with all zeros - Light Protocol checks for its existence
  // but doesn't actually use it for web wallet operations
  // This is a workaround for type compatibility only
  const dummySecretKey = new Uint8Array(32).fill(0);

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
    // Provide a dummy secretKey that satisfies the Signer interface
    // This is required but will never be used for web wallets
    secretKey: dummySecretKey
  };
};
