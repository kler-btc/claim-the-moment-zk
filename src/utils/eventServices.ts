
import { PublicKey } from '@solana/web3.js';
import { toast } from '@/components/ui/use-toast';
import { CompressionResult, EventDetails } from './types';
import { getSolanaConnection, getLightRpc } from './compressionApi';
import { createCompressedToken, claimCompressedToken } from './tokenServices';

// Create a new compressed token for an event
export const createEvent = async (
  eventDetails: EventDetails,
  walletPublicKey: string
): Promise<CompressionResult> => {
  console.log('Creating event with details:', eventDetails);
  console.log('Using wallet:', walletPublicKey);

  try {
    // Create a compressed token for the event
    const compressionResult = await createCompressedToken(eventDetails, walletPublicKey);
    
    // Store event metadata in local storage (for demo purposes)
    const eventDataKey = `event-${compressionResult.eventId}`;
    localStorage.setItem(eventDataKey, JSON.stringify({
      eventId: compressionResult.eventId,
      mintAddress: compressionResult.mintAddress,
      stateTreeAddress: compressionResult.merkleRoot,
      stateTreeIndex: 0, // For demonstration
      title: eventDetails.title,
      tokenAmount: eventDetails.attendeeCount,
      creator: walletPublicKey,
      createdAt: Date.now()
    }));
    
    toast({
      title: "Event Created Successfully",
      description: `Your event "${eventDetails.title}" has been created with compressed tokens on Solana devnet.`,
    });
    
    return compressionResult;
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
      // Update claims in local storage
      const claimsKey = `claims-${eventId}`;
      let claims = JSON.parse(localStorage.getItem(claimsKey) || '[]');
      claims.push(recipientWallet);
      localStorage.setItem(claimsKey, JSON.stringify(claims));
      
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
