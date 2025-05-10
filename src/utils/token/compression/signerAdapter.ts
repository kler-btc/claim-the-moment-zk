
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Light Protocol expects a signer that includes a secretKey, but browser wallets
 * never expose private keys. This adapter works around this limitation by providing
 * an interface that Light Protocol functions can use with appropriate type assertions.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions?: (txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
}

/**
 * Creates a Light Protocol compatible signer from a wallet adapter.
 * 
 * NOTE: This function returns an object that must be type-asserted when passed to
 * Light Protocol functions (using `as any`). This is safe at runtime because Light Protocol
 * functions only use the publicKey and signTransaction methods, not the secretKey.
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
    signTransaction: async (tx: Transaction | VersionedTransaction) => {
      return await signTransaction(tx);
    },
    // Adding signAllTransactions for completeness
    signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
      // Sign each transaction individually
      const signedTxs = [];
      for (const tx of txs) {
        const signedTx = await signTransaction(tx);
        signedTxs.push(signedTx);
      }
      return signedTxs;
    }
  };
};
