
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * This interface represents the adapter between Solana wallet adapters and 
 * Light Protocol's expected Signer interface.
 * 
 * Note: Light Protocol's interfaces expect a secretKey property, but we don't have
 * access to private keys when using browser wallets. We use explicit type assertions
 * when passing this adapter to Light Protocol functions.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

/**
 * Creates a Light Protocol compatible signer from a wallet adapter
 * 
 * @param publicKey - The public key of the wallet
 * @param signTransaction - The signTransaction function from the wallet adapter
 * @returns A signer object that can be used with Light Protocol functions (with type assertions)
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
    }
  };
};
