
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { createEvent } from '@/utils/eventServices';
import { EventDetails } from '@/utils/types';
import { CreationStep } from './useEventCreationState';

export const useTokenCreation = (
  setStep: (step: CreationStep) => void,
  walletPublicKey: string | null
) => {
  const { connection } = useConnection();
  const { signTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const createToken = async (eventDetails: EventDetails, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!walletPublicKey || !signTransaction) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to create an event"
      });
      return false;
    }

    // Validate form
    if (eventDetails.title.trim() === '' || 
        eventDetails.location.trim() === '' || 
        eventDetails.date.trim() === '' ||
        eventDetails.time.trim() === '' ||
        eventDetails.symbol.trim() === '' ||
        eventDetails.imageUrl.trim() === '' ||
        eventDetails.attendeeCount <= 0) {
      toast.error("Invalid Event Details", {
        description: "Please fill in all required fields with valid information."
      });
      return false;
    }

    // Validate token symbol length
    if (eventDetails.symbol.length > 10) {
      toast.error("Symbol too long", {
        description: "Token symbol must be 10 characters or less."
      });
      return false;
    }

    // Ensure reasonable token supply
    if (eventDetails.attendeeCount > 1000) {
      toast.error("Attendee count too high", {
        description: "For testing purposes, please limit attendees to 1000 or fewer."
      });
      return false;
    }

    setIsLoading(true);
    setStep(CreationStep.CREATING_TOKEN);
    setError(null); // Reset any previous errors
    
    console.log("Starting token creation process...");
    toast.info("Creating your event token...", {
      description: "Please approve the transaction in your wallet. This may take a moment."
    });

    try {
      // Log important details for debugging
      console.log("Current connection endpoint:", connection.rpcEndpoint);
      console.log("Wallet public key:", walletPublicKey);
      console.log("Event details:", {
        title: eventDetails.title,
        symbol: eventDetails.symbol,
        decimals: eventDetails.decimals,
        description: eventDetails.description ? eventDetails.description.slice(0, 50) + "..." : "",
        imageUrl: eventDetails.imageUrl,
        attendeeCount: eventDetails.attendeeCount
      });
      
      // Create the token with metadata using Token-2022
      const tokenResult = await createEvent(
        eventDetails, 
        walletPublicKey,
        connection,
        signTransaction
      );
      
      console.log("Token creation successful:", tokenResult);
      
      // Update state with token details
      setMintAddress(tokenResult.mintAddress || null);
      setEventId(tokenResult.eventId || null);
      setTransactionId(tokenResult.transactionId || null);
      
      // Update step
      setStep(CreationStep.TOKEN_CREATED);
      
      toast.success("Token Created Successfully!", {
        description: "Your event token has been created with Token-2022 metadata."
      });
      return true;
    } catch (error: any) {
      console.error("Error creating token:", error);
      console.error("Full error stack:", error.stack);
      
      // Store error for analysis
      setError(error);
      
      // Improved error messaging
      let errorMessage = "Failed to create event token.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific error patterns with more precise messaging
        if (error.message.includes('InvalidAccountData')) {
          errorMessage = "Token creation failed due to invalid account data. This might be due to sizing issues or initialization order.";
          console.error("InvalidAccountData error details:", error);
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = "Insufficient SOL in your wallet. Please add more SOL and try again.";
        } else if (error.message.includes('Transaction simulation failed')) {
          errorMessage = "Transaction simulation failed. The token parameters might be incorrect or the network is congested.";
        } else if (error.message.includes('Transaction too large')) {
          errorMessage = "Transaction exceeded size limits. Try reducing token metadata size.";
        }
      }
      
      setStep(CreationStep.INITIAL);
      toast.error("Error creating token", {
        description: errorMessage
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    mintAddress,
    eventId,
    transactionId,
    error,
    createToken
  };
};
