
import { PublicKey, Transaction } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Light Protocol expects a Signer object with specific properties.
 * This adapter converts our wallet adapter to their expected format.
 */
export interface LightProtocolSigner {
  publicKey: PublicKey;
  // Light Protocol uses signAllTransactions or signTransaction but not both
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Creates a Light Protocol compatible signer from a wallet adapter
 */
export const createLightSigner = (
  publicKey: PublicKey,
  signTransaction: SignerWalletAdapter['signTransaction']
): LightProtocolSigner => {
  return {
    publicKey,
    // We only need to implement the method Light Protocol actually uses
    signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
      // Sign transactions one by one using our signTransaction function
      const signedTxs: Transaction[] = [];
      for (const tx of txs) {
        const signedTx = await signTransaction(tx);
        signedTxs.push(signedTx);
      }
      return signedTxs;
    }
  };
};
