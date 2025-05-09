
import { 
  Connection, 
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID, TokenPoolResult } from '../types';
import { createBuffer } from '../../buffer';
import { toast } from 'sonner';

// Create a token pool for Light Protocol compression
export const createTokenPool = async (
  mintAddress: string,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenPoolResult> => {
  console.log('Creating token pool for mint:', mintAddress);
  
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const walletPubkey = new PublicKey(walletAddress);
    
    // Calculate a deterministic address for the token pool based on mint
    const poolSeed = Buffer.from('token_pool', 'utf-8');
    const poolAddress = PublicKey.findProgramAddressSync(
      [poolSeed, mintPubkey.toBuffer()],
      TOKEN_2022_PROGRAM_ID
    )[0];
    
    console.log('Token pool address:', poolAddress.toBase58());
    
    // Calculate space needed for the token pool (simplified for demo)
    // In a real implementation, this would need to be calculated based on Light Protocol specs
    const poolSize = 1000; 
    const poolLamports = await connection.getMinimumBalanceForRentExemption(poolSize);
    
    // Create the token pool transaction
    const transaction = new Transaction();
    
    // Add instruction to create the pool account
    // Note: In a real implementation with Light Protocol, this would use their SDK methods
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: poolAddress,
        space: poolSize,
        lamports: poolLamports,
        programId: TOKEN_2022_PROGRAM_ID
      })
    );
    
    // Initialize the pool (simplified for demo)
    // This simulates a Light Protocol pool initialization
    transaction.add(
      new TransactionInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [
          { pubkey: poolAddress, isSigner: false, isWritable: true },
          { pubkey: mintPubkey, isSigner: false, isWritable: false },
          { pubkey: walletPubkey, isSigner: true, isWritable: true }
        ],
        data: createBuffer(Buffer.from([0x07])) // Simulated instruction code
      })
    );
    
    // Set transaction parameters
    transaction.feePayer = walletPubkey;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Have the wallet sign the transaction
    console.log("Requesting wallet signature for pool creation...");
    const signedTx = await signTransaction(transaction);
    
    console.log("Transaction signed, sending to network...");
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    console.log("Waiting for transaction confirmation...");
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: (await connection.getBlockHeight()) + 150
    }, 'confirmed');
    
    console.log('Token pool created with tx:', txId);
    
    // Store pool information in local storage (for the demo)
    const storageKey = `pool-${mintAddress}`;
    localStorage.setItem(storageKey, JSON.stringify({
      poolAddress: poolAddress.toBase58(),
      mintAddress,
      transactionId: txId,
      createdAt: new Date().toISOString()
    }));

    // Return the transaction ID and merkle root
    return {
      transactionId: txId,
      merkleRoot: poolAddress.toBase58() // Using pool address as the merkle root for simplicity
    };
  } catch (error) {
    console.error('Error creating token pool:', error);
    toast.error("Failed to create token pool", {
      description: "Make sure you have enough SOL in your wallet and try again"
    });
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};
