
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from '@/components/ui/use-toast';
import { claimEventToken } from '@/utils/eventServices';
import { verifyTokenClaim } from '@/utils/compressionApi';

export const useTokenClaiming = (eventId: string | undefined) => {
  const { connected, publicKey } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

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
        variant: "destructive",
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

  return {
    connected,
    isClaiming,
    hasClaimed,
    handleClaimToken
  };
};
