import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { getEventDetails, claimEventToken } from '@/utils/eventServices';
import { verifyTokenClaim } from '@/utils/compressionApi';

export const useClaimToken = (initialEventId: string | undefined) => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();

  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualEventId, setManualEventId] = useState('');
  const [eventId, setEventId] = useState<string | undefined>(initialEventId);
  const [scanError, setScanError] = useState<string | null>(null);

  // Effect to fetch event data when eventId changes
  useEffect(() => {
    if (eventId) {
      fetchEventData(eventId);
    }
  }, [eventId]);

  // Effect to verify if the user has already claimed a token
  useEffect(() => {
    const checkTokenClaim = async () => {
      if (connected && publicKey && eventId) {
        try {
          const hasAlreadyClaimed = await verifyTokenClaim(eventId, publicKey.toString());
          setHasClaimed(hasAlreadyClaimed);
        } catch (error) {
          console.error('Error verifying token claim:', error);
        }
      }
    };

    checkTokenClaim();
  }, [connected, publicKey, eventId]);

  const fetchEventData = async (id: string) => {
    setIsVerifying(true);
    try {
      console.log('Fetching event data for ID:', id);
      const data = await getEventDetails(id);
      
      if (!data) {
        console.error('Event not found');
        toast({
          title: "Event Not Found",
          description: "The event you're looking for doesn't exist or has been removed.",
          variant: "destructive",
        });
        navigate('/claim');
        return;
      }
      
      console.log('Event data retrieved:', data);
      setEventData(data);
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event information. Please try again.",
        variant: "destructive",
      });
      navigate('/claim');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScan = (data: any) => {
    // Clear previous errors
    setScanError(null);
    
    if (data && data.text) {
      try {
        console.log('QR scan data received:', data.text);
        
        // Try to parse as URL first
        let eventId;
        if (data.text.includes('/claim/')) {
          const url = new URL(data.text);
          eventId = url.pathname.split('/claim/')[1];
        } else {
          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(data.text);
            eventId = jsonData.eventId;
          } catch {
            // If not valid JSON, use as-is if it appears to be an event ID
            eventId = data.text;
          }
        }
        
        if (eventId) {
          console.log('Event ID extracted:', eventId);
          stopScanning();
          navigate(`/claim/${eventId}`);
        } else {
          setScanError('Invalid QR code format. Please scan a valid event QR code.');
        }
      } catch (error) {
        console.error('Error processing QR data:', error);
        setScanError('Could not process QR code data.');
      }
    }
  };

  const handleError = (error: any) => {
    console.error('QR scan error:', error);
    
    // Keep more user-friendly error messages
    if (error.name === 'NotFoundError') {
      setScanError('Camera not found or not accessible.');
    } else if (error.name === 'NotAllowedError') {
      setScanError('Camera access denied. Please check your browser settings.');
    } else if (error.name === 'NotReadableError') {
      setScanError('Camera is already in use by another application.');
    } else {
      setScanError(`Scanner error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleClaimToken = async () => {
    if (!connected || !publicKey || !eventId) {
      toast({
        title: "Unable to Claim",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    if (hasClaimed) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed a token for this event.",
        variant: "warning",
      });
      return;
    }

    setIsClaiming(true);
    try {
      console.log('Claiming token for event:', eventId, 'to wallet:', publicKey.toString());
      const success = await claimEventToken(eventId, publicKey.toString());
      
      if (success) {
        setHasClaimed(true);
        toast({
          title: "Success!",
          description: "You've successfully claimed a token for this event.",
        });
      } else {
        toast({
          title: "Claim Failed",
          description: "Failed to claim token. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error claiming token:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred while claiming your token.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEventId.trim()) return;
    
    navigate(`/claim/${manualEventId.trim()}`);
    setManualEntryMode(false);
  };

  const toggleManualEntryMode = () => {
    setManualEntryMode(!manualEntryMode);
  };

  const startScanning = () => {
    setScanError(null);
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
    eventId,
    scanError,
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
