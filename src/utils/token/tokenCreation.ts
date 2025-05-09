
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  createInitializeMetadataPointerInstruction,
} from '@solana/spl-token';
import { createInitializeInstruction } from '@solana/spl-token';
import { TokenMetadata, TokenCreationResult, EventDetails, TOKEN_2022_PROGRAM_ID } from './types';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { calculateMetadataSize } from './tokenMetadataUtils';

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
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;

    // Initialize Transaction
    const transaction = new Transaction();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Calculate proper space for the mint account
    // We need to calculate the space for metadata extensions separately and correctly
    const extensions = [ExtensionType.MetadataPointer];
    const baseMintLen = getMintLen(extensions);
    
    console.log(`Base mint length with MetadataPointer extension: ${baseMintLen} bytes`);
    
    // Calculate the total size needed for the account, including metadata
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Total allocated size: ${totalSize} bytes`);
    
    // Calculate minimum required lamports for rent exemption
    const mintLamports = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Mint lamports required: ${mintLamports}`);
    
    // Add extra SOL to the account to ensure it's properly funded
    const extraSol = LAMPORTS_PER_SOL * 0.05; // 0.05 SOL extra funding
    const totalLamports = mintLamports + extraSol;
    console.log(`Total lamports allocated (with extra funding): ${totalLamports}`);
    
    // Step 1: Create account for the mint with sufficient space allocation
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize, 
      lamports: totalLamports,
      programId: TOKEN_2022_PROGRAM_ID // FIXED: Use the correct TOKEN_2022_PROGRAM_ID
    });
    
    // Step 2: Initialize the MetadataPointer extension
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey, // Point to self for metadata
      TOKEN_2022_PROGRAM_ID // FIXED: Use the correct TOKEN_2022_PROGRAM_ID
    );
    
    // Step 3: Initialize the mint with decimals
    const decimals = eventDetails.decimals || 0;
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey, // Mint authority
      null, // Freeze authority (null = no freeze)
      TOKEN_2022_PROGRAM_ID // FIXED: Use the correct TOKEN_2022_PROGRAM_ID
    );
    
    // Step 4: Initialize metadata for the token
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // FIXED: Use the correct TOKEN_2022_PROGRAM_ID
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
    
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      
      // Partially sign with the mint keypair since it's a new account
      transaction.partialSign(mint);
      
      console.log("Transaction prepared, requesting wallet signature...");
      
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(transaction);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send the transaction with specific options for better error handling
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false, // Enable preflight to catch errors before they hit the network
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
      console.log("Transaction sent with ID:", txid);
      console.log("Waiting for confirmation...");
      
      // Wait for confirmation with more detailed options
      await connection.confirmTransaction({
        signature: txid,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight 
      }, 'confirmed');
      
      // Store event data in local storage
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
    } catch (error: any) {
      // Enhanced error handling with detailed log extraction
      console.error('Error sending transaction:', error);
      
      // Try to extract and log detailed error information
      if (error.logs) {
        console.error('Transaction log details:', error.logs);
      } else if (error.message && error.message.includes('Transaction simulation failed')) {
        // Extract logs from the error message if possible
        const logMatch = error.message.match(/Logs:\s*(\[.*?\])/);
        if (logMatch && logMatch[1]) {
          try {
            const logs = JSON.parse(logMatch[1]);
            console.error('Extracted logs from error:', logs);
          } catch (parseError) {
            console.error('Could not parse logs from error message');
          }
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
