
import { 
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  SendTransactionError
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
import { eventService } from '@/lib/db';

/**
 * Creates a token with metadata using Token-2022 program
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
    console.log('Generated mint keypair:', mint.publicKey.toBase58());
    
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
    
    // Calculate space for accounts using Token-2022 specific calculations
    // The exact size calculation is critical for Token-2022 programs
    const extensions = [ExtensionType.MetadataPointer];
    const mintLen = getMintLen(extensions);
    
    // Calculate total size needed for the account to store both mint data and metadata
    const totalSize = calculateMetadataSize(metadata);
    console.log(`Calculated mint account size: ${totalSize} bytes`);
    
    // Get minimum required lamports for rent exemption with the calculated space
    const mintLamports = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required lamports for rent exemption: ${mintLamports}`);
    
    // CRITICAL FIX: Create account with correct size to avoid InvalidAccountData error
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    });
    
    // Initialize the MetadataPointer extension FIRST
    // The order of instructions is critical for Token-2022
    const metadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint.publicKey, // Mint account
      walletPubkey,   // Authority
      mint.publicKey, // Self-pointer for metadata
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize the mint with decimals AFTER the extension
    const decimals = eventDetails.decimals || 0;
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      walletPubkey, // Mint authority
      null,         // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    
    // Initialize metadata AFTER mint initialization
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey, // Same as mint for Token-2022 metadata pointer
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    
    // Add all instructions to the transaction in the correct order
    // Order matters for Token-2022 extensions
    transaction.add(
      createAccountInstruction,
      metadataPointerInstruction,
      initializeMintInstruction,
      initializeMetadataInstruction
    );
    
    // Set fee payer
    transaction.feePayer = walletPubkey;
    
    try {
      // Get latest blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      // Partial sign with the mint keypair (required for create account)
      transaction.partialSign(mint);
      
      console.log("Transaction prepared, requesting wallet signature...");
      
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(transaction);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send transaction with preflight enabled for better error detection
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false, // Enable preflight checks for better error detection
        preflightCommitment: 'confirmed'
      });
      
      console.log("Transaction sent with ID:", txid);
      
      // Wait for confirmation with more detailed options
      await connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight
      });
      
      // Store event data in database
      await eventService.saveEvent({
        id: eventId,
        mintAddress: mint.publicKey.toBase58(),
        ...eventDetails,
        createdAt: new Date().toISOString(),
        creator: walletAddress,
        transactionId: txid
      });
      
      console.log('Token created successfully with txid:', txid);
      
      return {
        eventId,
        mintAddress: mint.publicKey.toBase58(),
        transactionId: txid
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      
      if (error instanceof SendTransactionError) {
        console.error('Transaction error logs:', error.logs);
        
        // Extract specific error information from logs
        let errorMessage = "Transaction failed";
        if (error.logs) {
          // Find the most relevant error message in the logs
          const relevantErrorLog = error.logs.find(log => 
            log.includes('Error') || 
            log.includes('failed') || 
            log.includes('InvalidAccountData')
          );
          
          if (relevantErrorLog) {
            errorMessage = relevantErrorLog;
          }
        }
        
        throw new Error(`Token creation failed: ${errorMessage}`);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
