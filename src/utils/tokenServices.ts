
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Signer,
  Commitment
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
import { toast } from 'sonner';
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
    
    // Step 1: Get or create an associated token account (ATA) for the wallet
    console.log("Getting or creating associated token account...");
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      {
        publicKey: walletPubkey,
        signTransaction: signTransaction
      } as any, // Need to cast as the types don't match exactly
      mintPubkey,
      walletPubkey,
      false, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Associated token account:", ata.address.toString());
    
    // Step 2: Mint tokens to the ATA
    console.log("Creating transaction to mint tokens to ATA...");
    const mintAmount = 1000; // Example amount, adjust based on event requirements
    
    // Build mint transaction
    const mintTx = new Transaction();
    
    // Add instructions for minting tokens
    mintTx.add(
      // Use SPL token mintTo instruction
      Token2022.createMintToInstruction(
        TOKEN_2022_PROGRAM_ID,
        mintPubkey,
        ata.address,
        walletPubkey, // Mint authority
        [],
        mintAmount
      )
    );
    
    // Set transaction properties
    mintTx.feePayer = walletPubkey;
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have the user sign the transaction
    console.log("Requesting wallet signature for minting tokens...");
    const signedMintTx = await signTransaction(mintTx);
    
    // Send and confirm the mint transaction
    console.log("Sending mint transaction...");
    const mintTxId = await connection.sendRawTransaction(signedMintTx.serialize());
    await connection.confirmTransaction(mintTxId, 'confirmed' as Commitment);
    console.log("Tokens minted with transaction ID:", mintTxId);
    
    // Step 3: Create token pool using Light Protocol
    console.log("Creating token pool with Light Protocol...");
    
    // Get the instruction for token pool creation
    const poolTxInstructions = await CompressedTokenProgram.createPoolInstructions(
      walletPubkey,
      mintPubkey,
      undefined,  // Optional fee payer
      TOKEN_2022_PROGRAM_ID
    );
    
    // Create transaction for token pool creation
    const poolTx = new Transaction();
    poolTxInstructions.forEach(instruction => {
      poolTx.add(instruction);
    });
    
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
    
    // Step 4: Compress tokens
    console.log("Compressing tokens...");
    const compressTxInstructions = await CompressedTokenProgram.compressInstructions(
      walletPubkey, // payer
      mintPubkey,   // mint address
      mintAmount,   // amount to compress
      walletPubkey, // owner of the tokens
      ata.address,  // token account to compress
      walletPubkey  // recipient of compressed tokens
    );
    
    // Create transaction for token compression
    const compressTx = new Transaction();
    compressTxInstructions.forEach(instruction => {
      compressTx.add(instruction);
    });
    
    compressTx.feePayer = walletPubkey;
    compressTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Have the user sign the transaction
    console.log("Requesting wallet signature for token compression...");
    const signedCompressTx = await signTransaction(compressTx);
    
    // Send and confirm the compression transaction
    console.log("Sending compression transaction...");
    const compressTxId = await connection.sendRawTransaction(signedCompressTx.serialize());
    console.log("Waiting for compression confirmation...");
    await connection.confirmTransaction(compressTxId, 'confirmed' as Commitment);
    console.log("Tokens compressed with transaction ID:", compressTxId);
    
    // Get merkle root hash (simulated for now)
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
    
    // This would be the real implementation using Light Protocol
    // For now, just update local storage to simulate successful claim
    
    // Update claims in local storage
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
    const connection = getSolanaConnection();
    const walletPubkey = new PublicKey(wallet);
    const mintPubkey = new PublicKey(mintAddress);
    
    // This would be the real implementation using Light Protocol
    // For now, return simulated balance based on local storage claims
    // We'll check if this wallet has claimed from any events with this mint
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

// Temp workaround for Token2022 - in production use proper imports
const Token2022 = {
  createMintToInstruction: (
    programId: PublicKey,
    mint: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    multiSigners: Signer[],
    amount: number
  ): TransactionInstruction => {
    return {
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      data: Buffer.from([7, ...new Uint8Array(8).fill(0)]), // Mocked data
    };
  }
};
