
import { 
  Connection, 
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID, TokenPoolResult } from '../types';
import { createBuffer } from '../../buffer';
import { toast } from 'sonner';
import * as bs58 from 'bs58';

// Constants for Light Protocol's programs
const LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

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
    
    // In Light Protocol, token pools need to be at a predictable address
    // Here we generate a deterministic but unique pool address based on mint
    const poolSeed = Buffer.from(`pool-${mintAddress.substring(0, 8)}`);
    
    // Calculate a PDA for the pool account
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [poolSeed, mintPubkey.toBuffer()],
      LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID
    );
    
    console.log('Token pool address:', poolAddress.toBase58());
    
    // For token pool, we need larger space allocation
    const poolSize = 10000; // Generous allocation for token pool data
    const poolLamports = await connection.getMinimumBalanceForRentExemption(poolSize);
    
    // Add extra SOL to ensure the account is properly funded
    const totalLamports = poolLamports + (LAMPORTS_PER_SOL * 0.02); // 0.02 SOL extra
    
    // Create the token pool transaction
    const transaction = new Transaction();
    
    // For this demo, we'll create a system account as a placeholder for the token pool
    const poolKeypair = Keypair.generate();
    
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: poolKeypair.publicKey,
        space: poolSize,
        lamports: totalLamports,
        programId: LIGHT_PROTOCOL_COMPRESSION_PROGRAM_ID
      })
    );
    
    // In a real Light Protocol implementation, we would also add an instruction
    // to initialize the pool with the mint. For demo purposes, we're creating a system account.
    
    // Set transaction parameters
    transaction.feePayer = walletPubkey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Partially sign with the pool keypair
    transaction.partialSign(poolKeypair);
    
    // Have the wallet sign the transaction
    console.log("Requesting wallet signature for pool creation...");
    const signedTx = await signTransaction(transaction);
    
    console.log("Transaction signed, sending to network...");
    const txId = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });
    
    // Wait for confirmation
    console.log("Waiting for transaction confirmation...");
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }, 'confirmed');
    
    console.log('Token pool created with tx:', txId);
    
    // Generate a merkle root for the token pool (simulated for demo)
    const merkleRoot = bs58.encode(Buffer.from(`root-${Date.now()}`));
    
    // Store pool information in local storage (for the demo)
    const storageKey = `pool-${mintAddress}`;
    localStorage.setItem(storageKey, JSON.stringify({
      poolAddress: poolKeypair.publicKey.toBase58(),
      mintAddress,
      merkleRoot,
      transactionId: txId,
      createdAt: new Date().toISOString()
    }));

    // Return the transaction ID and merkle root
    return {
      transactionId: txId,
      merkleRoot: merkleRoot
    };
  } catch (error: any) {
    console.error('Error creating token pool:', error);
    
    // Improved error messaging
    let errorMessage = "Make sure you have enough SOL in your wallet and try again";
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        errorMessage = "Insufficient SOL in your wallet. Please add more SOL and try again.";
      } else if (error.message.includes('Transaction simulation failed')) {
        errorMessage = "Transaction simulation failed. Please try again or check Solana network status.";
      } else {
        errorMessage = error.message;
      }
    }
    
    toast.error("Failed to create token pool", {
      description: errorMessage
    });
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};
