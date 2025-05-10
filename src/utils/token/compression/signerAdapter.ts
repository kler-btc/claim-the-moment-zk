
import { PublicKey, Transaction, Keypair, VersionedTransaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Light Protocol expects a Signer object with specific properties.
 * This adapter converts our wallet adapter to their expected format.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  // Light Protocol uses either signAllTransactions or signTransaction
  signAllTransactions?: (txs: Transaction[] | VersionedTransaction[]) => Promise<Transaction[] | VersionedTransaction[]>;
  signTransaction?: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
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
    signTransaction: async (tx: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> => {
      return await signTransaction(tx);
    },
    // Provide the signAllTransactions method that Light Protocol expects
    signAllTransactions: async (txs: Transaction[] | VersionedTransaction[]): Promise<Transaction[] | VersionedTransaction[]> => {
      // Sign transactions one by one using our signTransaction function
      const signedTxs: (Transaction | VersionedTransaction)[] = [];
      for (const tx of txs) {
        const signedTx = await signTransaction(tx);
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
