
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { createEventTokenPool } from '@/utils/eventServices';
import { CreationStep } from './useEventCreationState';

export const useTokenPool = (setStep: (step: CreationStep) => void) => {
  const { connection } = useConnection();
  const { signTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [poolTransactionId, setPoolTransactionId] = useState<string | null>(null);

  const createTokenPool = async (mintAddress: string | null, walletPublicKey: string | null) => {
    if (!mintAddress || !walletPublicKey || !signTransaction) {
      toast.error("Cannot create token pool", {
        description: "Missing required token information or wallet connection"
      });
      return false;
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
      return true;
    } catch (error) {
      console.error("Error creating token pool:", error);
      setStep(CreationStep.TOKEN_CREATED); // Go back to the token created step
      toast.error("Error creating token pool", {
        description: error instanceof Error ? error.message : "Failed to create token pool. Please try again."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    poolTransactionId,
    createTokenPool
  };
};
