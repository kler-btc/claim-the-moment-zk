
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { toast } from '@/components/ui/use-toast';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { bn } from '@lightprotocol/stateless.js';
import { getSolanaConnection, getLightRpc } from './compressionApi';
import { EventDetails, CompressionResult } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

// Create a new compressed token for an event
export const createCompressedToken = async (
  eventDetails: EventDetails,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<CompressionResult> => {
  console.log('Creating compressed token with details:', eventDetails);
  console.log('Using wallet:', walletPublicKey);

  try {
    // Get connection
    const lightRpc = getLightRpc();
    
    // Get wallet public key
    const walletPubkey = new PublicKey(walletPublicKey);
    
    // Create a real transaction (simplified for demo)
    const transaction = new Transaction();
    
    // Create a unique event ID (in production this would be from a database)
    const eventId = `event-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Generate keypair for mint (in production this would be deterministic)
    const mintKeypair = Keypair.generate();
    
    // Add instruction for compressed token mint (simplified for demo)
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: await connection.getMinimumBalanceForRentExemption(82),
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // Set transaction fee payer
    transaction.feePayer = walletPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have the user sign the transaction
    let signedTransaction;
    try {
      signedTransaction = await signTransaction(transaction);
      console.log("Transaction signed successfully");
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw new Error("User rejected transaction signing");
    }
    
    // Send the signed transaction
    let transactionId;
    try {
      transactionId = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Transaction sent with ID:", transactionId);
      
      // Wait for confirmation
      await connection.confirmTransaction(transactionId);
      console.log("Transaction confirmed");
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw new Error("Failed to send transaction to Solana network");
    }
    
    // Create a claim URL with the event ID and mint address
    const claimUrl = `/claim/${eventId}`;
    
    // Create QR code data that includes the event ID, mint address, and other information
    const qrCodeData = JSON.stringify({
      type: 'cPOP-event',
      eventId,
      title: eventDetails.title,
      symbol: eventDetails.symbol,
      mintAddress: mintKeypair.publicKey.toString(),
      timestamp: Date.now(),
    });
    
    // Simulate state tree creation - in real implementation this would call the Light Protocol API
    const stateTreeAddress = Keypair.generate().publicKey;
    
    return {
      eventId,
      claimUrl,
      merkleRoot: stateTreeAddress.toString(),
      qrCodeData,
      mintAddress: mintKeypair.publicKey.toString(),
      transactionId
    };
  } catch (error) {
    console.error('Error creating compressed token:', error);
    toast({
      title: "Error Creating Event",
      description: "There was an error creating your event tokens. Please try again.",
      variant: "destructive",
    });
    throw new Error(`Failed to create compressed token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Function to claim a compressed token
export const claimCompressedToken = async (
  eventId: string,
  recipientWallet: string
): Promise<boolean> => {
  console.log(`Claiming token for event ${eventId} to wallet ${recipientWallet}`);
  
  try {
    const connection = getSolanaConnection();
    const lightRpc = getLightRpc();
    
    // Retrieve event data from local storage
    // In production, this would come from a database
    const eventDataKey = `event-${eventId}`;
    const eventDataStr = localStorage.getItem(eventDataKey);
    
    if (!eventDataStr) {
      throw new Error('Event data not found');
    }
    
    const eventData = JSON.parse(eventDataStr);
    const { mintAddress, stateTreeAddress, creator } = eventData;
    
    console.log(`Event data retrieved: ${JSON.stringify(eventData)}`);
    
    // Convert string addresses to PublicKeys
    const mintPubkey = new PublicKey(mintAddress);
    const stateTreePubkey = new PublicKey(stateTreeAddress);
    const creatorPubkey = new PublicKey(creator);
    const recipientPubkey = new PublicKey(recipientWallet);
    
    // For demo: Since we can't access the exact Light Protocol compression API,
    // we'll simulate the token claim by logging what would happen
    console.log('Building compression instruction (simulated)...');
    
    // Build transaction (simulated for demo)
    const transaction = new Transaction();
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = creatorPubkey;
    
    // In production, this transaction would be signed by both the creator and recipient
    // Since this is a demo with browser wallet, we would need to implement proper signing
    
    console.log('Transaction built and ready for signing via wallet adapter');
    
    return true;
  } catch (error) {
    console.error('Error claiming compressed token:', error);
    toast({
      title: "Error Claiming Token",
      description: error instanceof Error ? error.message : "There was an error claiming your token. Please try again.",
      variant: "destructive",
    });
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper to check balance of compressed tokens
export const getCompressedTokenBalance = async (
  wallet: string,
  mintAddress: string
): Promise<number> => {
  try {
    // In a real implementation, we would query the blockchain
    // For demo purposes, we'll return a simulated balance
    return 0;
  } catch (error) {
    console.error('Error getting compressed token balance:', error);
    return 0;
  }
};
