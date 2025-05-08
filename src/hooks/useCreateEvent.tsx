
import { useState } from 'react';
import { EventDetails, CompressionResult } from '@/utils/types';
import { createEvent } from '@/utils/eventServices';
import { useToast } from '@/hooks/use-toast';

export const useCreateEvent = (walletPublicKey: string | null) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    location: '',
    date: '',
    time: '',
    description: '',
    attendeeCount: 50, // Default value
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({
      ...prev,
      [name]: name === 'attendeeCount' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletPublicKey) {
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
      // Use the real ZK compression implementation
      const compressionResult = await createEvent(
        eventDetails, 
        walletPublicKey
      );
      
      // Generate the full claim URL with the host
      const claimUrl = `${window.location.origin}${compressionResult.claimUrl}`;
      setQrCodeUrl(claimUrl);
      setMintAddress(compressionResult.mintAddress || null);
      
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
    handleInputChange,
    handleCreateEvent,
    downloadQRCode
  };
};
