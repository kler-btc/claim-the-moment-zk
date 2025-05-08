
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

    setIsLoading(true);
    setStep(CreationStep.CREATING_TOKEN);
    
    console.log("Starting token creation process...");
    toast.info("Creating your event token...", {
      description: "Please approve the transaction in your wallet."
    });

    try {
      // Create the token with metadata using Token-2022
      console.log("Sending token creation request...");
      
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
    } catch (error) {
      console.error("Error creating token:", error);
      setStep(CreationStep.INITIAL);
      toast.error("Error creating token", {
        description: error instanceof Error ? error.message : "Failed to mint token. Please try again."
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
    createToken
  };
};
