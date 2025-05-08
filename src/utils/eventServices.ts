
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { toast } from '@/components/ui/use-toast';
import { CompressionResult, EventDetails } from './types';
import { getSolanaConnection, getLightRpc } from './compressionApi';
import { createCompressedToken, claimCompressedToken, createTokenPool } from './tokenServices';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

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
    const tokenResult = await createCompressedToken(
      eventDetails, 
      walletPublicKey,
      connection,
      signTransaction
    );
    
    // Return the result
    return tokenResult;
  } catch (error) {
    console.error('Error creating event:', error);
    toast({
      title: "Error Creating Event",
      description: "There was an error creating your event tokens. Please try again.",
      variant: "destructive",
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
): Promise<{ transactionId: string, merkleRoot: string }> => {
  try {
    // Create a token pool for compression
    const poolResult = await createTokenPool(
      mintAddress,
      walletPublicKey,
      connection,
      signTransaction
    );
    
    // Return the result
    return poolResult;
  } catch (error) {
    console.error('Error creating token pool:', error);
    toast({
      title: "Error Creating Token Pool",
      description: "There was an error creating your token pool. Please try again.",
      variant: "destructive",
    });
    throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get event details from local storage
export const getEventDetails = async (eventId: string): Promise<any> => {
  try {
    const eventDataKey = `event-${eventId}`;
    const storedData = localStorage.getItem(eventDataKey);
    
    if (storedData) {
      return JSON.parse(storedData);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
};

// Claim a token for an event
export const claimEventToken = async (
  eventId: string,
  recipientWallet: string
): Promise<boolean> => {
  console.log(`Claiming token for event ${eventId} to wallet ${recipientWallet}`);
  
  try {
    // Use the compression service to claim the token
    const success = await claimCompressedToken(eventId, recipientWallet);
    
    if (success) {
      toast({
        title: "Token Claimed Successfully",
        description: "You have successfully claimed the compressed token for this event.",
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error claiming token:', error);
    toast({
      title: "Error Claiming Token",
      description: error instanceof Error ? error.message : "There was an error claiming your token. Please try again.",
      variant: "destructive",
    });
    throw new Error(`Failed to claim token: ${error instanceof Error ? error.message : String(error)}`);
  }
};
