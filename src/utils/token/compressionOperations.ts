
import { 
  Connection, 
  PublicKey,
  Transaction,
  Commitment
} from '@solana/web3.js';
import { toast } from 'sonner';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { getSolanaConnection } from '../compressionApi';
import { TokenPoolResult, TransactionSigner } from './types';

// Create token pool for compression
export const createTokenPool = async (
  mintAddress: string,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: TransactionSigner['signTransaction']
): Promise<TokenPoolResult> => {
  console.log('Creating token pool for mint address:', mintAddress);
  
  try {
    const walletPubkey = new PublicKey(walletPublicKey);
    const mintPubkey = new PublicKey(mintAddress);
    
    // Create token pool transaction
    console.log("Creating token pool with Light Protocol...");
    
    // Create a transaction for the token pool
    const poolTx = new Transaction();
    
    // Get the pool creation instructions from the SDK
    // Note: Using createPool instead of createPoolInstructions since the latter doesn't exist
    const poolInstruction = await CompressedTokenProgram.createPool({
      payer: walletPubkey,
      mint: mintPubkey
    });
    
    poolTx.add(poolInstruction);
    
    // Set transaction properties
    poolTx.feePayer = walletPubkey;
    poolTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have the user sign the transaction
    console.log("Requesting wallet signature for token pool creation...");
    const signedPoolTx = await signTransaction(poolTx);
    
    // Send and confirm the token pool transaction
    console.log("Sending token pool transaction...");
    const poolTxId = await connection.sendRawTransaction(signedPoolTx.serialize());
    console.log("Waiting for token pool confirmation...");
    await connection.confirmTransaction(poolTxId, 'confirmed' as Commitment);
    console.log("Token pool created with transaction ID:", poolTxId);
    
    // Get simulated merkle root (would be returned from RPC in production)
    const merkleRoot = `merkle-${Date.now().toString(36)}`;
    
    return {
      transactionId: poolTxId,
      merkleRoot
    };
  } catch (error) {
    console.error('Error creating token pool:', error);
    toast.error("Error Creating Token Pool: " + (error instanceof Error ? error.message : String(error)));
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Compress tokens into Light Protocol's compressed token format
export const compressTokens = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  tokenAccount: PublicKey,
  amount: number,
  signTransaction: TransactionSigner['signTransaction']
): Promise<string> => {
  try {
    console.log(`Compressing ${amount} tokens from account ${tokenAccount.toString()}`);
    
    // Create a transaction for compression
    const compressTx = new Transaction();
    
    // Add compression instruction from SDK
    // Note: Using compress instead of compressInstructions since the latter doesn't exist
    const compressInstruction = await CompressedTokenProgram.compress({
      payer: owner,
      mint: mint,
      amount: amount,
      owner: owner,
      tokenAccount: tokenAccount,
      recipient: owner
    });
    
    compressTx.add(compressInstruction);
    
    // Set transaction properties
    compressTx.feePayer = owner;
    compressTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have user sign transaction
    const signedTx = await signTransaction(compressTx);
    
    // Send and confirm transaction
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txId, 'confirmed' as Commitment);
    
    return txId;
  } catch (error) {
    console.error('Error compressing tokens:', error);
    throw new Error(`Failed to compress tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Function to claim a compressed token
export const claimCompressedToken = async (
  eventId: string,
  recipientWallet: string
): Promise<boolean> => {
  console.log(`Claiming token for event ${eventId} to wallet ${recipientWallet}`);
  
  try {
    // Retrieve event data from local storage
    const eventDataKey = `event-${eventId}`;
    const eventDataStr = localStorage.getItem(eventDataKey);
    
    if (!eventDataStr) {
      throw new Error('Event data not found');
    }
    
    const eventData = JSON.parse(eventDataStr);
    console.log(`Event data retrieved: ${JSON.stringify(eventData)}`);
    
    // Update claims in local storage (simulating blockchain interaction)
    const claimsKey = `claims-${eventId}`;
    let claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    claims.push(recipientWallet);
    localStorage.setItem(claimsKey, JSON.stringify(claims));
    
    return true;
  } catch (error) {
    console.error('Error claiming compressed token:', error);
    toast.error("Error Claiming Token: " + (error instanceof Error ? error.message : String(error)));
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper to check balance of compressed tokens
export const getCompressedTokenBalance = async (
  wallet: string,
  mintAddress: string
): Promise<number> => {
  try {
    console.log(`Checking compressed token balance for wallet ${wallet} and mint ${mintAddress}`);
    
    // This simulates checking claims from local storage
    // In production, this would query the compressed token state
    const events = Object.keys(localStorage)
      .filter(key => key.startsWith('event-'))
      .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
      .filter(event => event.mintAddress === mintAddress);
    
    let balance = 0;
    for (const event of events) {
      const eventId = event.eventId;
      const claimsKey = `claims-${eventId}`;
      const claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
      if (claims.includes(wallet)) {
        balance += 1;
      }
    }
    
    return balance;
  } catch (error) {
    console.error('Error getting compressed token balance:', error);
    return 0;
  }
};
