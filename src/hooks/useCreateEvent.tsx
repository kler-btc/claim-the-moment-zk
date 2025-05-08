
import React, { useState } from 'react';
import { EventDetails, CompressionResult, TokenCreationStep } from '@/utils/types';
import { createEvent, createEventTokenPool } from '@/utils/eventServices';
import { toast } from 'sonner';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';

// Step enum to track creation process
export enum CreationStep {
  INITIAL = 'initial',
  CREATING_TOKEN = 'creating_token',
  TOKEN_CREATED = 'token_created',
  CREATING_POOL = 'creating_pool',
  POOL_CREATED = 'pool_created',
  GENERATING_QR = 'generating_qr',
  COMPLETE = 'complete'
}

export const useCreateEvent = (walletPublicKey: string | null) => {
  const { connection } = useConnection();
  const { signTransaction, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [poolTransactionId, setPoolTransactionId] = useState<string | null>(null);
  const [step, setStep] = useState<CreationStep>(CreationStep.INITIAL);
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    location: '',
    date: '',
    time: '',
    description: '',
    attendeeCount: 50, // Default value
    symbol: '',
    decimals: 0,
    imageUrl: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({
      ...prev,
      [name]: name === 'attendeeCount' || name === 'decimals' ? parseInt(value) || 0 : value,
    }));
  };

  // Step 1: Create Token
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletPublicKey || !signTransaction || !publicKey) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to create an event"
      });
      return;
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
      return;
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
    } catch (error) {
      console.error("Error creating token:", error);
      setStep(CreationStep.INITIAL);
      toast.error("Error creating token", {
        description: error instanceof Error ? error.message : "Failed to mint token. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Create Token Pool
  const handleCreateTokenPool = async () => {
    if (!mintAddress || !walletPublicKey || !signTransaction) {
      toast.error("Cannot create token pool", {
        description: "Missing required token information or wallet connection"
      });
      return;
    }

    setIsLoading(true);
    setStep(CreationStep.CREATING_POOL);
    
    console.log("Starting token pool creation process...");
    toast.info("Creating compression pool...", {
      description: "Please approve the transaction in your wallet."
    });

    try {
      // Call token pool creation function
      console.log("Sending token pool creation request with mint:", mintAddress);
      
      const poolResult = await createEventTokenPool(
        mintAddress, 
        walletPublicKey,
        connection,
        signTransaction
      );
      
      console.log("Pool creation successful:", poolResult);
      
      // Update with pool transaction ID
      setPoolTransactionId(poolResult.transactionId);
      
      // Update step
      setStep(CreationStep.POOL_CREATED);
      
      toast.success("Token Pool Created!", {
        description: "Your token is now registered with Light Protocol compression."
      });
    } catch (error) {
      console.error("Error creating token pool:", error);
      setStep(CreationStep.TOKEN_CREATED); // Go back to the token created step
      toast.error("Error creating token pool", {
        description: error instanceof Error ? error.message : "Failed to create token pool. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Generate QR Code
  const handleGenerateQR = async () => {
    if (!eventId) {
      toast.error("Cannot generate QR code", {
        description: "Missing event information"
      });
      return;
    }

    setIsLoading(true);
    setStep(CreationStep.GENERATING_QR);

    try {
      console.log("Generating QR code for event ID:", eventId);
      
      // Generate the full claim URL with the host to ensure it's a valid URL for QR scanning
      const claimUrl = `${window.location.origin}/claim/${eventId}`;
      console.log("Generated claim URL:", claimUrl);
      
      // Set the QR code URL
      setQrCodeUrl(claimUrl);
      
      // Update step
      setStep(CreationStep.COMPLETE);
      
      toast.success("QR Code Generated!", {
        description: "Your QR code is ready for sharing with attendees."
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Error generating QR code", {
        description: "Failed to generate QR code. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const canvas = document.getElementById('qr-code')?.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `${eventDetails.title.replace(/\s+/g, '-')}-qr-code.png`;
    link.href = url;
    link.click();
  };

  return {
    eventDetails,
    isLoading,
    qrCodeUrl,
    mintAddress,
    eventId,
    transactionId,
    poolTransactionId,
    step,
    handleInputChange,
    handleCreateEvent,
    handleCreateTokenPool,
    handleGenerateQR,
    downloadQRCode
  };
};
