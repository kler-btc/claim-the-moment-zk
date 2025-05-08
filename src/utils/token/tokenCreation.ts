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
  pack,
  createInitializeInstruction
} from '@solana/spl-token';
import { TokenMetadata, TokenCreationResult, EventDetails } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TOKEN_2022_PROGRAM_ID } from './types';
import { CompressedTokenProgram } from '@lightprotocol/stateless.js';

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

    // Calculate minimum required lamports for rent exemption
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

    // Create account for the mint
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    });
    
    // Add metadata pointer to the mint
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize the mint
    const decimals = eventDetails.decimals || 0;
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey,
      null,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize metadata for the token
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey,
    });
    
    // Add all instructions to the transaction
    transaction.add(
      createAccountInstruction,
      metadataPointerInstruction,
      initializeMintInstruction,
      initializeMetadataInstruction
    );
    
    // Set fee payer and recent blockhash
    transaction.feePayer = walletPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    
    // Partially sign with the mint keypair
    transaction.partialSign(mint);
    
    // Have the wallet sign the transaction
    const signedTransaction = await signTransaction(transaction);
    
    // Send and confirm the transaction
    const txid = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction(txid, 'confirmed');
    
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
