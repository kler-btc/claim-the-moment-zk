
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';

/**
 * Sends a transaction and handles confirmation with proper error handling
 */
export const sendAndConfirmTokenTransaction = async (
  connection: Connection,
  transaction: Transaction,
  walletPubkey: PublicKey
): Promise<string> => {
  try {
    console.log("Transaction prepared with", transaction.instructions.length, "instructions");
    console.log("Instructions:", transaction.instructions.map((ix, i) => 
      `${i}: ${ix.programId.toString().substring(0, 10)}...`).join(', '));
    
    // Send the transaction with skipPreflight to avoid simulation errors
    const txid = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 5
    });
    
    console.log("Transaction sent with ID:", txid);
    console.log("Waiting for confirmation...");
    
    // Simple confirmation with error handling
    const status = await connection.confirmTransaction(txid, 'confirmed');
    
    if (status.value.err) {
      throw new Error(`Transaction confirmed but failed: ${JSON.stringify(status.value.err)}`);
    }
    
    console.log("Transaction confirmed successfully");
    return txid;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};
