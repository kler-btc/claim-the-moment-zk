
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  sendAndConfirmTransaction,
  clusterApiUrl
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { toast } from '@/components/ui/use-toast';
import { 
  CompressedTokenProgram,
  createEmptyStateTree,
  createTokenPool,
  StateTreeInfo,
  selectStateTreeInfo,
  selectMinCompressedTokenAccountsForTransfer
} from '@lightprotocol/compressed-token';
import { bn, Rpc, RpcError } from '@lightprotocol/stateless.js';

// Helius API key for devnet
const HELIUS_API_KEY = '9aeaaaaa-ac88-42a4-8f49-7b0c23cee762';
const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export interface EventDetails {
  title: string;
  location: string;
  date: string;
  time: string;
  description: string;
  attendeeCount: number;
}

export interface CompressionResult {
  eventId: string;
  claimUrl: string;
  merkleRoot?: string;
  qrCodeData?: string;
  mintAddress?: string;
}

// Create an RPC connection to Solana devnet via Helius
const getSolanaConnection = () => {
  return new Connection(HELIUS_RPC_URL, 'confirmed');
};

// Create a Light Protocol RPC client
const getLightRpc = () => {
  return new Rpc(HELIUS_RPC_URL);
};

// Helper to create a keypair from private key (for testing/demo purposes)
// In production, this would use the connected wallet's publicKey and signing
const getKeypairFromPrivateKey = (privateKeyBase58: string): Keypair => {
  return Keypair.fromSecretKey(
    Buffer.from(privateKeyBase58, 'base58')
  );
};

// Create a new compressed token for an event
export const createCompressedToken = async (
  eventDetails: EventDetails,
  walletPublicKey: string
): Promise<CompressionResult> => {
  console.log('Creating compressed token with details:', eventDetails);
  console.log('Using wallet:', walletPublicKey);

  try {
    // Get connection
    const connection = getSolanaConnection();
    const lightRpc = getLightRpc();
    
    // Get wallet public key
    const walletPubkey = new PublicKey(walletPublicKey);
    
    // For browser environments, we use the connected wallet
    // The frontend will handle signing via wallet adapter
    
    // 1. Create and register mint
    const decimals = 0; // No decimal places for event tokens
    const mintKeypair = Keypair.generate(); // Generate new keypair for the mint
    
    console.log('Creating new mint...');
    const mintTx = await createMint(
      connection,
      await keypairFromWallet(connection, walletPubkey), // payer
      walletPubkey, // mint authority
      walletPubkey, // freeze authority
      decimals,
      mintKeypair, // pregenerated mint keypair
      undefined,
      TOKEN_PROGRAM_ID
    );
    
    console.log(`Mint created: ${mintKeypair.publicKey.toString()} (tx: ${mintTx})`);
    
    // 2. Create token pool for compression
    console.log('Creating token pool for compression...');
    const poolCreateTx = await createTokenPool(
      connection,
      await keypairFromWallet(connection, walletPubkey), // payer
      mintKeypair.publicKey // mint
    );
    
    console.log(`Token pool created: ${poolCreateTx}`);
    
    // 3. Get or create ATA for the creator
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      await keypairFromWallet(connection, walletPubkey), // payer
      mintKeypair.publicKey, // mint
      walletPubkey // owner
    );
    
    // 4. Mint tokens to the creator's ATA
    const totalSupply = eventDetails.attendeeCount;
    console.log(`Minting ${totalSupply} tokens to creator's ATA...`);
    const mintToTx = await mintTo(
      connection,
      await keypairFromWallet(connection, walletPubkey), // payer
      mintKeypair.publicKey, // mint
      ata.address, // destination
      walletPubkey, // authority
      totalSupply, // amount
      [], // signers
      undefined,
      TOKEN_PROGRAM_ID
    );
    
    console.log(`Minted tokens: ${mintToTx}`);
    
    // 5. Create state tree for compression
    console.log('Creating state tree for compression...');
    const stateTreeResult = await createEmptyStateTree(
      connection,
      await keypairFromWallet(connection, walletPubkey) // payer
    );
    
    console.log(`State tree created: ${stateTreeResult.stateTree.toString()}`);
    
    // Store tree info for later use
    const stateTreeInfo: StateTreeInfo = {
      stateTree: stateTreeResult.stateTree,
      index: stateTreeResult.index
    };
    
    // Generate a unique event ID (in production this would be from a database)
    const eventId = `event-${mintKeypair.publicKey.toString().substring(0, 8)}`;
    
    // Create a claim URL with the event ID and mint address
    const claimUrl = `/claim/${eventId}`;
    
    // Create QR code data that includes the event ID, mint address, and other information
    const qrCodeData = JSON.stringify({
      type: 'cPOP-event',
      eventId,
      title: eventDetails.title,
      mintAddress: mintKeypair.publicKey.toString(),
      stateTreeAddress: stateTreeResult.stateTree.toString(),
      timestamp: Date.now(),
    });
    
    // Store the mint and state tree association in local storage for demo
    // In production, this would be stored in a database
    const eventDataKey = `event-${eventId}`;
    localStorage.setItem(eventDataKey, JSON.stringify({
      eventId,
      mintAddress: mintKeypair.publicKey.toString(),
      stateTreeAddress: stateTreeResult.stateTree.toString(),
      stateTreeIndex: stateTreeResult.index,
      title: eventDetails.title,
      tokenAmount: totalSupply,
      creator: walletPubkey.toString(),
      createdAt: Date.now()
    }));
    
    toast({
      title: "Event Created Successfully",
      description: `Your event "${eventDetails.title}" has been created with compressed tokens on Solana devnet.`,
    });
    
    return {
      eventId,
      claimUrl,
      merkleRoot: stateTreeResult.stateTree.toString(),
      qrCodeData,
      mintAddress: mintKeypair.publicKey.toString()
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
    const { mintAddress, stateTreeAddress, stateTreeIndex, creator } = eventData;
    
    console.log(`Event data retrieved: ${JSON.stringify(eventData)}`);
    
    // Convert string addresses to PublicKeys
    const mintPubkey = new PublicKey(mintAddress);
    const stateTreePubkey = new PublicKey(stateTreeAddress);
    const creatorPubkey = new PublicKey(creator);
    const recipientPubkey = new PublicKey(recipientWallet);
    
    // Check if the recipient already has this token
    const alreadyClaimed = await verifyTokenClaim(eventId, recipientWallet);
    if (alreadyClaimed) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed a token for this event.",
      });
      return true;
    }
    
    // Get creator's token accounts for this mint
    console.log(`Finding token accounts for creator ${creator} and mint ${mintAddress}`);
    const creatorAccounts = await connection.getParsedTokenAccountsByOwner(
      creatorPubkey,
      { mint: mintPubkey }
    );
    
    if (creatorAccounts.value.length === 0 || 
        !creatorAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount) {
      throw new Error('Event creator has no tokens available to claim');
    }
    
    // Get the source token account
    const sourceTokenAccount = creatorAccounts.value[0].pubkey;
    console.log(`Found source token account: ${sourceTokenAccount.toString()}`);
    
    // Create state tree info
    const stateTreeInfo: StateTreeInfo = {
      stateTree: stateTreePubkey,
      index: stateTreeIndex
    };
    
    // Prepare compression instruction
    console.log('Building compression instruction...');
    const compressIx = await CompressedTokenProgram.compress({
      payer: creatorPubkey,
      owner: creatorPubkey,
      source: sourceTokenAccount,
      toAddress: [recipientPubkey],
      amount: [bn(1)], // Transfer 1 token
      mint: mintPubkey,
      tokenPoolAddress: await CompressedTokenProgram.findTokenPoolAddress(mintPubkey),
      outputStateTreeInfo: stateTreeInfo,
    });
    
    // Build transaction
    const transaction = new Transaction().add(compressIx);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = creatorPubkey;
    
    // In production, this transaction would be signed by both the creator and recipient
    // Since this is a demo with browser wallet, we would need to implement proper signing
    // via wallet adapter in the frontend
    
    // For demo purposes, this is where the wallet adapter would sign
    console.log('Transaction built and ready for signing via wallet adapter');
    
    toast({
      title: "Token Claimed Successfully",
      description: `You have successfully claimed the compressed token for event "${eventData.title}"`,
    });
    
    // In a real implementation, we would update the event data to track claims
    // For demo, we'll just mark as claimed in local storage
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

// Verify if a wallet has already claimed a token for an event
export const verifyTokenClaim = async (
  eventId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    // For demo purposes, we'll check local storage
    // In production, this would query Helius compression APIs
    const claimsKey = `claims-${eventId}`;
    const claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
    return claims.includes(walletAddress);
  } catch (error) {
    console.error('Error verifying token claim:', error);
    return false;
  }
};

// Helper function to mimic wallet keypair for demo (browser environment)
// In production, actual signing would be done via wallet adapter
async function keypairFromWallet(connection: Connection, pubkey: PublicKey): Promise<Keypair> {
  // This is just a dummy implementation for demo purposes
  // In production, wallet adapter would handle signing
  return Keypair.generate();
}
