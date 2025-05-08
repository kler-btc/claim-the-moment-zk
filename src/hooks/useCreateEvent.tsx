
import React, { useState } from 'react';
import { EventDetails, CompressionResult } from '@/utils/types';
import { createEvent } from '@/utils/eventServices';
import { toast } from '@/components/ui/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';

export const useCreateEvent = (walletPublicKey: string | null) => {
  const { connection } = useConnection();
  const { signTransaction, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletPublicKey || !signTransaction || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create an event",
        variant: "destructive",
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
      toast({
        title: "Invalid Event Details",
        description: "Please fill in all required fields with valid information.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the updated compression implementation with wallet transaction signing
      const compressionResult = await createEvent(
        eventDetails, 
        walletPublicKey,
        connection,
        signTransaction
      );
      
      // Generate the full claim URL with the host
      const claimUrl = `${window.location.origin}${compressionResult.claimUrl}`;
      setQrCodeUrl(claimUrl);
      setMintAddress(compressionResult.mintAddress || null);
      setEventId(compressionResult.eventId || null);
      setTransactionId(compressionResult.transactionId || null);
      
      toast({
        title: "Event created successfully!",
        description: "Compressed token minted with ZK compression on Solana devnet.",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error creating event",
        description: error instanceof Error ? error.message : "Failed to mint compressed token. Please try again.",
        variant: "destructive",
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
    handleInputChange,
    handleCreateEvent,
    downloadQRCode
  };
};
