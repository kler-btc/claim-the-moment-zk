
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { verifyTokenClaim } from '@/utils/compressionApi';
import { claimService } from '@/lib/db';
import { claimCompressedToken } from '@/utils/token/compression/claimOperations';

export const useTokenClaiming = (eventId: string | undefined) => {
  const { connection } = useConnection();
  const { connected, publicKey, signTransaction } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);

  // Effect to verify if the user has already claimed a token
  useEffect(() => {
    const checkTokenClaim = async () => {
      if (connected && publicKey && eventId) {
        try {
          // Use our database to check claim status
          const hasAlreadyClaimed = await verifyTokenClaim(eventId, publicKey.toString());
          setHasClaimed(hasAlreadyClaimed);
        } catch (error) {
          console.error('Error verifying token claim:', error);
          setHasClaimed(null);
        }
      } else {
        setHasClaimed(null);
      }
    };

    checkTokenClaim();
  }, [connected, publicKey, eventId]);

  const handleClaimToken = async () => {
    if (!connected || !publicKey || !eventId || !signTransaction) {
      // If wallet is not connected, show the wallet modal instead of an error
      if (!connected) {
        const walletButton = document.querySelector('.wallet-button .wallet-adapter-button');
        if (walletButton instanceof HTMLElement) {
          walletButton.click();
          return;
        }
      }
      
      toast.error("Unable to Claim", {
        description: "Please connect your wallet first."
      });
      return;
    }

    if (hasClaimed) {
      toast.error("Already Claimed", {
        description: "You have already claimed a token for this event."
      });
      return;
    }

    setIsClaiming(true);
    try {
      console.log('Claiming token for event:', eventId, 'to wallet:', publicKey.toString());
      
      // Use our enhanced claim function with connected wallet
      const success = await claimCompressedToken(
        eventId, 
        publicKey.toString(),
        connection,
        signTransaction
      );
      
      if (success) {
        setHasClaimed(true);
        toast.success("Success!", {
          description: "You've successfully claimed a token for this event."
        });
      } else {
        toast.error("Claim Failed", {
          description: "Failed to claim token. Please try again later."
        });
      }
    } catch (error) {
      console.error('Error claiming token:', error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An unknown error occurred while claiming your token."
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
