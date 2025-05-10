
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
    
    // Send the transaction
    const txid = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 5
    });
    
    console.log("Transaction sent with ID:", txid);
    console.log("Waiting for confirmation...");
    
    // Wait for confirmation with proper timeout handling
    const confirmed = await Promise.race([
      connection.confirmTransaction(
        {
          signature: txid,
          blockhash: transaction.recentBlockhash,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        },
        'confirmed'
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
      )
    ]).catch(error => {
      console.error('Confirmation error:', error);
      return { value: { err: 'timeout' } };
    });
    
    // Type check for confirmation result
    if (confirmed && 
        typeof confirmed === 'object' && 
        'value' in confirmed && 
        confirmed.value && 
        typeof confirmed.value === 'object' && 
        'err' in confirmed.value) {
      throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmed.value.err)}`);
    }
    
    console.log("Transaction confirmed successfully");
    return txid;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};
