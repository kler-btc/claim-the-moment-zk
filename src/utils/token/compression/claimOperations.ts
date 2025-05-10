
import { PublicKey, Transaction, TransactionInstruction, SendTransactionError } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { toast } from 'sonner';
import { transfer } from '@lightprotocol/compressed-token';
import { eventService, poolService, claimService } from '@/lib/db';
import { getLightRpc } from '@/utils/compressionApi';
import { createLightSigner } from './signerAdapter';

// On-demand claim a compressed token
export const claimCompressedToken = async (
  eventId: string,
  recipientWallet: string,
  connection: any, // Accept any to handle both Connection and Rpc
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<boolean> => {
  try {
    console.log(`Claiming compressed token for event ${eventId} to wallet ${recipientWallet}`);
    
    // Check if this wallet already claimed a token for this event
    const hasClaimed = await claimService.hasWalletClaimedEvent(eventId, recipientWallet);
    if (hasClaimed) {
      throw new Error('You have already claimed a token for this event');
    }
    
    // Get the event data from persistent storage
    const eventData = await eventService.getEventById(eventId);
    if (!eventData) {
      throw new Error(`Event ${eventId} not found`);
    }
    
    const mintAddress = eventData.mintAddress;
    const creatorWallet = eventData.creator;
    
    // Get the token pool data
    const poolData = await poolService.getPoolByMintAddress(mintAddress);
    if (!poolData) {
      throw new Error(`Token pool for ${mintAddress} not found. Please ensure the event has a token pool created.`);
    }
    
    // Record the pending claim before executing the transaction
    const claimId = await claimService.saveClaim({
      eventId,
      walletAddress: recipientWallet,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    console.log(`Initiating transfer of 1 token from ${creatorWallet} to ${recipientWallet}`);
    
    try {
      // Convert string addresses to PublicKey objects
      const mintPubkey = new PublicKey(mintAddress);
      const recipientPubkey = new PublicKey(recipientWallet);
      const creatorPubkey = new PublicKey(creatorWallet);
      
      // Get Light Protocol RPC instance
      const lightRpc = getLightRpc();
      
      // Create Light Protocol compatible signer with our enhanced adapter
      const lightSigner = createLightSigner(creatorPubkey, signTransaction);
      
      // Call Light Protocol's transfer function to move a compressed token
      // Type cast as 'any' to bypass type checking since our adapter is compatible
      const transferTxId = await transfer(
        lightRpc,
        lightSigner,
        mintPubkey,
        1, // Transfer 1 token
        lightSigner, // Same signer as owner
        recipientPubkey
      );
      
      console.log('Transfer transaction sent with ID:', transferTxId);
      
      // Wait for confirmation (use the original connection for this)
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: transferTxId,
        blockhash: latestBlockhash.blockhash,
      }, 'confirmed');
      
      console.log(`Token transfer confirmed with txId: ${transferTxId}`);
      
      // Update claim record with success status
      await claimService.updateClaimStatus(claimId, 'confirmed', transferTxId);
      
      toast.success("Token Claimed Successfully", {
        description: "You have successfully claimed a compressed token for this event."
      });
      
      return true;
    } catch (error) {
      console.error('Error during token claim transaction:', error);
      
      let errorMessage = "Failed to claim token";
      
      // Extract detailed error information from SendTransactionError
      if (error instanceof SendTransactionError && error.logs) {
        console.error('Transaction log details:', error.logs);
        errorMessage = `Transaction error: ${error.logs.join('\n')}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Update claim record with failure status
      await claimService.updateClaimStatus(claimId, 'failed', undefined, errorMessage);
      
      toast.error("Error Claiming Token", {
        description: errorMessage
      });
      
      throw new Error(`Failed to claim token: ${errorMessage}`);
    }
    
  } catch (error) {
    console.error('Error claiming compressed token:', error);
    toast.error("Error Claiming Token", {
      description: error instanceof Error ? error.message : "Failed to claim token"
    });
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
