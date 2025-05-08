
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { claimEventToken, getEventDetails } from '@/utils/eventServices';
import { verifyTokenClaim } from '@/utils/compressionApi';
import { useToast } from '@/hooks/use-toast';

export const useClaimToken = (eventId: string | undefined) => {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualEventId, setManualEventId] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && connected && publicKey) {
      checkIfClaimed();
    }
  }, [eventId, connected, publicKey]);

  const fetchEventDetails = async (id: string) => {
    try {
      const parsedData = await getEventDetails(id);
      
      if (parsedData) {
        setEventData({
          title: parsedData.title,
          organizer: parsedData.creator ? parsedData.creator.substring(0, 6) + '...' + parsedData.creator.substring(parsedData.creator.length - 4) : 'Unknown',
          date: new Date(parsedData.createdAt).toLocaleDateString(),
          location: 'Solana Devnet',
          mintAddress: parsedData.mintAddress,
          stateTreeAddress: parsedData.stateTreeAddress,
        });
      } else {
        toast({
          title: "Event Not Found",
          description: "Could not find details for this event.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error Loading Event",
        description: "Could not load event details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkIfClaimed = async () => {
    if (!eventId || !publicKey) return;
    
    setIsVerifying(true);
    try {
      const claimed = await verifyTokenClaim(
        eventId, 
        publicKey.toString()
      );
      setHasClaimed(claimed);
    } catch (error) {
      console.error("Error checking claim status:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScan = (data: { text: string } | null) => {
    if (data && data.text) {
      setIsScanning(false);
      
      try {
        // Try to parse the QR data as JSON first
        try {
          const jsonData = JSON.parse(data.text);
          if (jsonData.eventId) {
            window.location.href = `/claim/${jsonData.eventId}`;
            return;
          }
        } catch (e) {
          // Not JSON, continue with URL parsing
        }
        
        // Parse as URL
        try {
          const url = new URL(data.text);
          const pathParts = url.pathname.split('/');
          if (pathParts.includes('claim') && pathParts.length > 2) {
            const scannedEventId = pathParts[pathParts.indexOf('claim') + 1];
            window.location.href = `/claim/${scannedEventId}`;
          } else {
            toast({
              title: "Invalid QR Code",
              description: "This QR code doesn't contain a valid claim link.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error Scanning QR",
            description: "The QR code couldn't be processed. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error processing QR code:", error);
        toast({
          title: "Error Processing QR",
          description: "Could not process the QR code data. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast({
      title: "Camera Error",
      description: "There was an error accessing your camera. Please check permissions.",
      variant: "destructive",
    });
    setIsScanning(false);
  };

  const handleClaimToken = async () => {
    if (!connected || !publicKey || !eventId) {
      toast({
        title: "Cannot Claim Token",
        description: connected ? "Invalid event data." : "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);

    try {
      const success = await claimEventToken(
        eventId,
        publicKey.toString()
      );
      
      if (success) {
        toast({
          title: "Token Claimed Successfully!",
          description: "The compressed token has been added to your wallet.",
        });
        setHasClaimed(true);
      }
    } catch (error) {
      console.error("Error claiming token:", error);
      toast({
        title: "Error Claiming Token",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEventId.trim()) {
      window.location.href = `/claim/${manualEventId.trim()}`;
    }
  };

  const toggleManualEntryMode = () => {
    setManualEntryMode(prev => !prev);
  };

  const startScanning = () => {
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  return {
    isScanning,
    isClaiming,
    isVerifying,
    eventData,
    hasClaimed,
    manualEntryMode,
    manualEventId,
    connected,
    handleScan,
    handleError,
    handleClaimToken,
    handleManualSubmit,
    setManualEventId,
    toggleManualEntryMode,
    startScanning,
    stopScanning
  };
};
