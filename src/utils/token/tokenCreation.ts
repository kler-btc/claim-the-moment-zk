
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  sendAndConfirmTransaction,
  Commitment
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { toast } from 'sonner';
import { EventDetails, CompressionResult } from '../types';
import { getSolanaConnection } from '../compressionApi';
import { createMintInstructions, createMintToInstruction } from './tokenInstructions';
import { TOKEN_2022_PROGRAM_ID, TokenCreationResult, TransactionSigner } from './types';

// Create a new token for an event with metadata
export const createToken = async (
  eventDetails: EventDetails,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: TransactionSigner['signTransaction']
): Promise<CompressionResult> => {
  console.log('Creating token with details:', eventDetails);
  console.log('Using wallet:', walletPublicKey);

  try {
    // Get wallet public key
    const walletPubkey = new PublicKey(walletPublicKey);
    
    // Generate keypair for mint
    const mintKeypair = Keypair.generate();
    console.log("Generated mint address:", mintKeypair.publicKey.toString());
    
    // Prepare metadata
    const decimals = eventDetails.decimals || 0;
    const metadata = { 
      mint: mintKeypair.publicKey,
      name: eventDetails.title,
      symbol: eventDetails.symbol,
      uri: eventDetails.imageUrl,
      additionalMetadata: [
        ["event_date", eventDetails.date],
        ["event_time", eventDetails.time],
        ["event_location", eventDetails.location],
        ["event_description", eventDetails.description || ""]
      ],
    };
    
    // Calculate required space and rent
    const mintLamports = await connection.getMinimumBalanceForRentExemption(1024); // Approximate size
    
    // Create a transaction for mint creation
    const mintTx = new Transaction();
    
    // Get mint instructions and add to transaction
    const mintInstructions = await createMintInstructions(
      mintKeypair.publicKey,
      walletPubkey,
      decimals,
      metadata
    );
    
    mintInstructions.forEach(instruction => {
      mintTx.add(instruction);
    });
    
    // Set transaction fee payer and recent blockhash
    mintTx.feePayer = walletPubkey;
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Partial sign with the mint keypair
    mintTx.partialSign(mintKeypair);
    
    // Have the user sign the transaction
    let signedTransaction;
    try {
      console.log("Requesting wallet signature for token creation...");
      signedTransaction = await signTransaction(mintTx);
      console.log("Transaction signed successfully by wallet");
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw new Error("User rejected transaction signing");
    }
    
    // Send the signed transaction
    let transactionId;
    try {
      console.log("Sending signed transaction to network...");
      transactionId = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Transaction sent with ID:", transactionId);
      
      // Wait for confirmation
      console.log("Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction(transactionId, 'confirmed' as Commitment);
      console.log("Transaction confirmed:", confirmation);
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
    } catch (error) {
      console.error("Error sending/confirming transaction:", error);
      throw new Error("Failed to send/confirm transaction to Solana network");
    }
    
    // Create a unique event ID
    const eventId = `event-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Create a claim URL with the event ID
    const claimUrl = `/claim/${eventId}`;
    
    // Create QR code data that includes the event info
    const qrCodeData = JSON.stringify({
      type: 'cPOP-event',
      eventId,
      title: eventDetails.title,
      symbol: eventDetails.symbol,
      mintAddress: mintKeypair.publicKey.toString(),
      timestamp: Date.now(),
    });
    
    // For demonstration - in production we'd store event data more securely
    const eventDataKey = `event-${eventId}`;
    localStorage.setItem(eventDataKey, JSON.stringify({
      eventId,
      mintAddress: mintKeypair.publicKey.toString(),
      title: eventDetails.title,
      symbol: eventDetails.symbol,
      decimals: eventDetails.decimals,
      imageUrl: eventDetails.imageUrl,
      tokenAmount: eventDetails.attendeeCount,
      creator: walletPublicKey,
      createdAt: Date.now(),
      transactionId
    }));
    
    return {
      eventId,
      claimUrl,
      merkleRoot: "", // Will be populated when token pool is created
      qrCodeData,
      mintAddress: mintKeypair.publicKey.toString(),
      transactionId
    };
  } catch (error) {
    console.error('Error creating token:', error);
    toast.error("Error Creating Token: " + (error instanceof Error ? error.message : String(error)));
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper to mint tokens to an account
export const mintTokens = async (
  connection: Connection,
  mint: PublicKey,
  recipient: PublicKey,
  authority: PublicKey,
  amount: number,
  signTransaction: TransactionSigner['signTransaction']
): Promise<TokenCreationResult> => {
  try {
    console.log(`Minting ${amount} tokens to recipient ${recipient.toString()}`);
    
    // Get or create associated token account
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      { publicKey: authority, signTransaction } as any,
      mint,
      recipient,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Create mint transaction
    const mintTx = new Transaction();
    
    // Add mint instruction
    mintTx.add(createMintToInstruction(mint, ata.address, authority, amount));
    
    // Set transaction properties
    mintTx.feePayer = authority;
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have user sign transaction
    const signedTx = await signTransaction(mintTx);
    
    // Send and confirm transaction
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txId, 'confirmed' as Commitment);
    
    return {
      mintAddress: mint.toString(),
      transactionId: txId
    };
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw new Error(`Failed to mint tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
};
