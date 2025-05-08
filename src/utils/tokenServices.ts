
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
  getMintLen,
  TOKEN_PROGRAM_ID,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createInitializeInstruction, 
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { toast } from '@/components/ui/use-toast';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { bn } from '@lightprotocol/stateless.js';
import { getSolanaConnection, getLightRpc } from './compressionApi';
import { EventDetails, CompressionResult } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

// Token-2022 program ID
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

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
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = 1024; // Approximate size for metadata
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    
    // Create a transaction for mint creation
    const mintTx = new Transaction();
    
    // Add instruction to create mint account
    mintTx.add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      // Initialize metadata pointer extension
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey, 
        walletPubkey,  // payer/update authority
        mintKeypair.publicKey, // metadata address
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize the mint with decimals
      createInitializeMintInstruction(
        mintKeypair.publicKey, 
        decimals, 
        walletPubkey, // mint authority
        null, // freeze authority (null = no freeze)
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Add metadata initialization
    mintTx.add(
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mintKeypair.publicKey,
        metadata: mintKeypair.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: walletPubkey,
        updateAuthority: walletPubkey,
      })
    );
    
    // Set transaction fee payer
    mintTx.feePayer = walletPubkey;
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Partial sign with the mint keypair
    mintTx.partialSign(mintKeypair);
    
    // Have the user sign the transaction
    let signedTransaction;
    try {
      signedTransaction = await signTransaction(mintTx);
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
      const confirmation = await connection.confirmTransaction(transactionId);
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
    toast({
      title: "Error Creating Token",
      description: "There was an error creating your token. Please try again.",
      variant: "destructive",
    });
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Function to create the token pool for compression using Light Protocol
export const createTokenPool = async (
  mintAddress: string,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<{ transactionId: string, merkleRoot: string }> => {
  console.log('Creating token pool for mint address:', mintAddress);
  
  try {
    // Get Light Protocol RPC
    const lightRpc = getLightRpc();
    const walletPubkey = new PublicKey(walletPublicKey);
    const mintPubkey = new PublicKey(mintAddress);
    
    // In a real implementation, we'd use the Light Protocol's createTokenPool function
    // For demo purposes, we'll simulate this with a delay
    // const poolTxId = await CompressedTokenProgram.createTokenPool(
    //   connection,
    //   walletPubkey, 
    //   mintPubkey,
    //   undefined,           // optional fee payer
    //   TOKEN_2022_PROGRAM_ID
    // );
    
    // For demo purposes
    await new Promise(resolve => setTimeout(resolve, 2000));
    const poolTxId = `pool-${Date.now().toString(36)}`;
    const merkleRoot = `merkle-${Date.now().toString(36)}`;
    
    return {
      transactionId: poolTxId,
      merkleRoot
    };
  } catch (error) {
    console.error('Error creating token pool:', error);
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
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
    const { mintAddress, creator } = eventData;
    
    console.log(`Event data retrieved: ${JSON.stringify(eventData)}`);
    
    // Convert string addresses to PublicKeys
    const mintPubkey = new PublicKey(mintAddress);
    const creatorPubkey = new PublicKey(creator);
    const recipientPubkey = new PublicKey(recipientWallet);
    
    // For demo: Since we can't access the exact Light Protocol compression API,
    // we'll simulate the token claim by logging what would happen
    console.log('Building compression instruction (simulated)...');
    
    // In a real implementation, we'd execute the token transfer
    // const transferTxId = await CompressedTokenProgram.transfer(
    //   connection,
    //   creatorPubkey,
    //   mintPubkey,
    //   1, // Transfer one token
    //   creatorPubkey, // From creator
    //   recipientPubkey // To recipient
    // );
    
    // Update claims in local storage
    const claimsKey = `claims-${eventId}`;
    let claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    claims.push(recipientWallet);
    localStorage.setItem(claimsKey, JSON.stringify(claims));
    
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
