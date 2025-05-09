
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeInstruction
} from '@solana/spl-token';
import { TokenMetadata, TokenCreationResult, EventDetails } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID } from './types';
import { COMPRESSED_TOKEN_PROGRAM_ID } from '@lightprotocol/stateless.js';

/**
 * Creates a token with metadata
 */
export const createToken = async (
  eventDetails: EventDetails,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenCreationResult> => {
  console.log('Creating token with metadata for event:', eventDetails.title);
  console.log('Using wallet:', walletAddress);

  try {
    // Generate a new keypair for the mint
    const mint = Keypair.generate();
    
    // Set token metadata
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title,
      symbol: eventDetails.symbol,
      uri: eventDetails.imageUrl,
      additionalMetadata: [
        ['description', eventDetails.description],
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location],
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event (in a real app, this could be a database ID)
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;

    // Initialize Transaction
    const transaction = new Transaction();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Calculate space needed for the mint with MetadataPointer extension
    const extensions = [ExtensionType.MetadataPointer];
    const mintLen = getMintLen(extensions);
    
    // Calculate metadata size - manually estimate size since no pack function is available
    // Let's allocate extra space to ensure we have enough room for metadata
    const estimatedAdditionalMetadataSize = metadata.additionalMetadata ? 
      metadata.additionalMetadata.reduce((acc, [key, value]) => acc + key.length + value.length + 2, 0) : 0;
    
    const estimatedMetadataSize = 
      metadata.name.length + 
      metadata.symbol.length + 
      metadata.uri.length + 
      estimatedAdditionalMetadataSize +
      100; // Extra buffer space
    
    // Calculate minimum required lamports for rent exemption
    // Allocate extra space to ensure enough room for metadata
    const baseSpace = mintLen + estimatedMetadataSize + 1024; // Add extra space for metadata
    const mintLamports = await connection.getMinimumBalanceForRentExemption(baseSpace);

    console.log(`Creating mint account with space: ${baseSpace} bytes`);
    console.log(`Mint lamports required: ${mintLamports}`);

    // Create account for the mint
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: baseSpace,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    });
    
    // Add metadata pointer to the mint
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey, // Point to self for metadata
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize the mint
    const decimals = eventDetails.decimals || 0;
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey, // Mint authority
      walletPubkey, // Freeze authority (same as mint authority)
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize metadata for the token - create with standard properties (no additionalMetadata)
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    
    // Add all instructions to the transaction IN THE CORRECT ORDER
    transaction.add(
      createAccountInstruction,
      metadataPointerInstruction,
      initializeMintInstruction,
      initializeMetadataInstruction
    );
    
    // Set fee payer and recent blockhash
    transaction.feePayer = walletPubkey;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Partially sign with the mint keypair
    transaction.partialSign(mint);
    
    console.log("Transaction prepared, requesting wallet signature...");
    
    // Have the wallet sign the transaction
    const signedTransaction = await signTransaction(transaction);
    
    console.log("Transaction signed by wallet, sending to network...");
    
    // Send and confirm the transaction
    const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    console.log("Transaction sent with ID:", txid);
    console.log("Waiting for confirmation...");
    
    // Wait for confirmation with more detailed options
    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: (await connection.getBlockHeight()) + 150
    }, 'confirmed');
    
    console.log("Transaction confirmation:", confirmation);
    
    if (confirmation.value.err) {
      throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    // Store event data in local storage (in a real app, this would be in a database)
    const eventDataKey = `event-${eventId}`;
    localStorage.setItem(eventDataKey, JSON.stringify({
      id: eventId,
      mintAddress: mint.publicKey.toBase58(),
      ...eventDetails,
      createdAt: new Date().toISOString(),
      creator: walletAddress
    }));
    
    console.log('Token created successfully with txid:', txid);
    
    return {
      eventId,
      mintAddress: mint.publicKey.toBase58(),
      transactionId: txid
    };
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
