
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Light Protocol expects a signer that includes a secretKey, but browser wallets
 * never expose private keys. This adapter works around this limitation by providing
 * an interface compatible with Light Protocol's functions.
 * 
 * IMPORTANT: When using this adapter with Light Protocol functions, always use 'as any'
 * type assertion. This is safe because Light Protocol only uses publicKey and 
 * signTransaction methods at runtime, not the secretKey.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions?: (txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
}

/**
 * Creates a Light Protocol compatible signer from a wallet adapter.
 * 
 * @example
 * // Example usage:
 * const lightSigner = createLightSigner(wallet.publicKey, wallet.signTransaction);
 * const txId = await someGlightFunction(connection, lightSigner as any, ...otherParams);
 * 
 * @param publicKey - The public key of the wallet
 * @param signTransaction - The signTransaction function from the wallet adapter
 * @returns A signer object that can be used with Light Protocol functions (with type assertion)
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
    // Optional: Add signAllTransactions for batch operations
    signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
      const signedTxs = [];
      for (const tx of txs) {
        const signedTx = await signTransaction(tx);
        signedTxs.push(signedTx);
      }
      return signedTxs;
    }
  };
};
