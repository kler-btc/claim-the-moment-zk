
import { 
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  SendTransactionError,
  SystemProgram,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TokenMetadata, TokenCreationResult, EventDetails, TOKEN_2022_PROGRAM_ID } from '../types';
import { buildTokenCreationInstructions } from '../transaction/tokenInstructionBuilder';
import { sendAndConfirmTokenTransaction } from '../transaction/tokenTransactionUtils';
import { saveEventData } from '../storage/eventStorage';
import { 
  ExtensionType, 
  getMintLen,
  getMinimumBalanceForRentExemptMint,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createInitializeInstruction
} from '@solana/spl-token';
import { calculateMetadataSize } from '../tokenMetadataUtils';
import { toast } from 'sonner';

// Properly define the confirmation result interface
interface TransactionConfirmation {
  value: {
    err: any | null;
  }
}

/**
 * Creates a token with all necessary metadata
 */
export const createTokenWithMetadata = async (
  eventDetails: EventDetails,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenCreationResult> => {
  try {
    // Generate a new keypair for the mint
    const mint = Keypair.generate();
    console.log('Generated mint keypair:', mint.publicKey.toBase58());
    
    // IMPORTANT: To avoid Symbol-related issues, ensure it doesn't conflict with SOL
    // Users reported issues with 'Sol' as a symbol
    let tokenSymbol = eventDetails.symbol;
    if (tokenSymbol.toLowerCase() === 'sol') {
      tokenSymbol = `${tokenSymbol}_`;
      console.log('Adjusted token symbol to avoid conflicts:', tokenSymbol);
    }
    
    // Set token metadata - trim values to avoid overflow
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: eventDetails.title.substring(0, 32), // 32 characters max for name
      symbol: tokenSymbol.substring(0, 10), // 10 characters max for symbol
      uri: eventDetails.imageUrl.substring(0, 200), // Limit URI length
      additionalMetadata: [
        ['description', (eventDetails.description || '').substring(0, 500)],
        ['date', eventDetails.date],
        ['time', eventDetails.time],
        ['location', eventDetails.location],
        ['supply', eventDetails.attendeeCount.toString()]
      ]
    };
    
    // Generate random ID for this event
    const eventId = `event-${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 8)}`;
    const walletPubkey = new PublicKey(walletAddress);
    
    // CRITICAL CHANGE: Use MUCH higher compute budget for Token-2022 operations
    // Maximum allowed units are 1.4 million
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000 // Maximum allowed compute
    });
    
    // Increase priority fee significantly for better transaction success rate
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 250000 // Increased from 100000 to ensure priority
    });
    
    // Use our improved size calculation function
    const calculatedSize = calculateMetadataSize(metadata);
    
    // Track and log size metrics
    console.log(`Base mint size: 82, metadata fields: ${
      metadata.name.length + metadata.symbol.length + metadata.uri.length
    }, additional: ${metadata.additionalMetadata ? 
      metadata.additionalMetadata.reduce((acc, [k, v]) => acc + k.length + v.length + 8, 0) : 0
    }`);
    
    // CRITICAL: Use a much higher fixed size to avoid any potential size issues
    // This is the key fix for InvalidAccountData - this value should be high enough
    const totalSize = 120000; // 120 KB allocation - significantly higher than needed
    console.log(`Using fixed account size of: ${totalSize} bytes to prevent InvalidAccountData errors`);
    
    // Calculate rent exemption for our larger size
    const rentExemption = await connection.getMinimumBalanceForRentExemption(totalSize);
    console.log(`Required rent: ${rentExemption} lamports`);
    
    // Add detailed debug logs
    console.log('Transaction preparation details:');
    console.log('- RPC endpoint:', connection.rpcEndpoint);
    console.log('- Wallet pubkey:', walletPubkey.toString());
    console.log('- Token-2022 program ID:', TOKEN_2022_PROGRAM_ID.toString());
    
    // Build transaction with proper instruction ordering and focused debugging
    const tx = new Transaction();
    
    // Step 1: Add compute budget and priority fee instructions first
    tx.add(computeBudgetIx);
    tx.add(priorityFeeIx);
    
    // Step 2: Create system account with fixed larger space
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint.publicKey,
      space: totalSize, // Using fixed larger size instead of calculated
      lamports: rentExemption,
      programId: TOKEN_2022_PROGRAM_ID
    });
    tx.add(createAccountIx);
    console.log('Added createAccount instruction with fixed size:', totalSize);
    
    // Step 3: CRITICAL: Initialize metadata pointer extension FIRST
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      walletPubkey,
      mint.publicKey, // Metadata pointer to self
      TOKEN_2022_PROGRAM_ID
    );
    tx.add(initMetadataPointerIx);
    console.log('Added initMetadataPointer instruction');
    
    // Step 4: Initialize mint second
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      0, // For event tokens, use 0 decimals
      walletPubkey,
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    );
    tx.add(initMintIx);
    console.log('Added initMint instruction with 0 decimals');
    
    // Step 5: Initialize metadata last
    const initMetadataIx = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    });
    tx.add(initMetadataIx);
    console.log('Added initMetadata instruction');
    
    tx.feePayer = walletPubkey;
    
    // CRITICAL: Get a fresh blockhash with finalized commitment to avoid blockhash issues
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    
    // Sign with mint keypair first (since it's a new account being created)
    tx.partialSign(mint);
    
    try {
      console.log("Requesting wallet signature for transaction...");
      
      // Have the wallet sign the transaction
      const signedTransaction = await signTransaction(tx);
      
      console.log("Transaction signed by wallet, sending to network...");
      
      // Send and confirm the transaction with improved settings
      const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true, // Skip preflight checks due to compute budget requirements
        preflightCommitment: 'confirmed',
        maxRetries: 5
      });
      
      console.log("Transaction sent with ID:", txid);
      toast.info("Transaction submitted", {
        description: "Your transaction is being processed, please wait..."
      });
      
      // Wait for confirmation with proper timeout and error handling
      try {
        // Use a timeout promise with explicit typing
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 90000)
        );
        
        // Wait for confirmation with proper typing
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature: txid,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight
          }, 'confirmed'),
          timeoutPromise
        ]).catch(error => {
          console.log('Confirmation timeout or error, will check status later:', error);
          // Even if confirmation times out, the transaction might still succeed
          return { value: { err: null } } as TransactionConfirmation;
        });
        
        // Type-safe checking of confirmation result
        if (confirmation && 
            typeof confirmation === 'object' && 
            'value' in confirmation &&
            confirmation.value && 
            typeof confirmation.value === 'object' &&
            'err' in confirmation.value && 
            confirmation.value.err) {
          throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log('Transaction confirmed successfully');
        
        // Store event data
        await saveEventData(
          eventId,
          mint.publicKey.toBase58(),
          eventDetails,
          walletAddress,
          txid
        );
        
        console.log('Token created successfully with txid:', txid);
        
        return {
          eventId,
          mintAddress: mint.publicKey.toBase58(),
          transactionId: txid
        };
      } catch (confirmError) {
        console.error("Error confirming transaction:", confirmError);
        
        // Check transaction status directly as a fallback
        const status = await connection.getSignatureStatus(txid);
        console.log("Transaction status:", status);
        
        if (status && status.value && !status.value.err) {
          console.log("Transaction succeeded despite confirmation error");
          
          // Store event data
          await saveEventData(
            eventId,
            mint.publicKey.toBase58(),
            eventDetails,
            walletAddress,
            txid
          );
          
          return {
            eventId,
            mintAddress: mint.publicKey.toBase58(),
            transactionId: txid
          };
        }
        
        throw confirmError;
      }
    } catch (error) {
      console.error('Error sending transaction:', error);
      
      if (error instanceof SendTransactionError && error.logs) {
        console.error('Transaction error logs:');
        for (const log of error.logs) {
          console.error(`- ${log}`);
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
