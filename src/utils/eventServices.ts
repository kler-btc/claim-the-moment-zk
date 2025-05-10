
import { PublicKey, Connection } from '@solana/web3.js';
import { toast } from 'sonner';
import { CompressionResult, EventDetails } from './types';
import { getSolanaConnection } from './compressionApi';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { 
  createToken, 
  createTokenPool as createCompressionPool, 
  claimCompressedToken 
} from './token';
import { eventService, poolService, claimService } from '@/lib/db';

// Create a new token for an event with metadata
export const createEvent = async (
  eventDetails: EventDetails,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<CompressionResult> => {
  console.log('Creating event with details:', eventDetails);
  console.log('Using wallet:', walletPublicKey);

  try {
    // Create a token with metadata for the event
    const tokenResult = await createToken(
      eventDetails, 
      walletPublicKey,
      connection,
      signTransaction
    );
    
    console.log("Token created successfully:", tokenResult);
    
    // Return the result with additional fields to match CompressionResult
    return {
      eventId: tokenResult.eventId,
      claimUrl: `${window.location.origin}/claim/${tokenResult.eventId}`,
      qrCodeData: tokenResult.eventId,
      mintAddress: tokenResult.mintAddress,
      merkleRoot: null,
      transactionId: tokenResult.transactionId
    };
  } catch (error) {
    console.error('Error creating event:', error);
    toast.error("Error Creating Event", {
      description: "There was an error creating your event tokens. Please try again."
    });
    throw new Error(`Failed to create event: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Create a token pool for compression
export const createEventTokenPool = async (
  mintAddress: string,
  walletPublicKey: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<{ transactionId: string, merkleRoot: string, poolAddress: string, stateTreeAddress: string }> => {
  try {
    console.log("Creating token pool for mint:", mintAddress);
    
    // Create a token pool for compression
    const poolResult = await createCompressionPool(
      mintAddress,
      walletPublicKey,
      connection,
      signTransaction
    );
    
    console.log("Token pool created successfully:", poolResult);
    
    // Return the result
    return poolResult;
  } catch (error) {
    console.error('Error creating token pool:', error);
    toast.error("Error Creating Token Pool", {
      description: "There was an error creating your token pool. Please try again."
    });
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get event details from database
export const getEventDetails = async (eventId: string): Promise<any> => {
  try {
    // Get event from persistent storage
    const event = await eventService.getEventById(eventId);
    
    if (!event) {
      console.error(`Event with ID ${eventId} not found in database`);
      return null;
    }
    
    // If the event exists, also fetch the associated pool data if available
    const pool = await poolService.getPoolByEventId(eventId);
    
    // Combine event and pool data for a complete view
    return {
      ...event,
      poolAddress: pool?.poolAddress || null,
      poolTransactionId: pool?.transactionId || null,
    };
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
};

// Get list of all events
export const getAllEvents = async (): Promise<any[]> => {
  try {
    const events = await eventService.getAllEvents();
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

// Claim a token for an event
export const claimEventToken = async (
  eventId: string,
  recipientWallet: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<boolean> => {
  console.log(`Claiming token for event ${eventId} to wallet ${recipientWallet}`);
  
  try {
    // Use the compression service to claim the token
    const success = await claimCompressedToken(
      eventId, 
      recipientWallet,
      connection,
      signTransaction
    );
    
    if (success) {
      toast.success("Token Claimed Successfully", {
        description: "You have successfully claimed the compressed token for this event."
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error claiming token:', error);
    toast.error("Error Claiming Token", {
      description: error instanceof Error ? error.message : "There was an error claiming your token. Please try again."
    });
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get claim history for an event
export const getEventClaimHistory = async (eventId: string): Promise<any[]> => {
  try {
    return await claimService.getClaimsByEventId(eventId);
  } catch (error) {
    console.error('Error fetching claim history:', error);
    return [];
  }
};

// Get claim history for a wallet
export const getWalletClaimHistory = async (walletAddress: string): Promise<any[]> => {
  try {
    return await claimService.getClaimsByWallet(walletAddress);
  } catch (error) {
    console.error('Error fetching wallet claim history:', error);
    return [];
  }
};
