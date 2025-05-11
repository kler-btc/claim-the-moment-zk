
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
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 2;

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
      setRetries(0); // Reset retries on success
      
      toast.success("Token Pool Created!", {
        description: "Your token is now registered with Light Protocol compression."
      });
      return true;
    } catch (error) {
      console.error("Error creating token pool:", error);
      
      // Check if this is a known error that might require a retry
      if (error instanceof Error) {
        if (
          (error.message.includes("signature verification") || 
           error.message.includes("Simulation failed") || 
           error.message.includes("TOKEN_POOL_RETRY")) 
          && retries < MAX_RETRIES
        ) {
          // Increment retries and try again with a specific error
          setRetries(prev => prev + 1);
          
          toast.info("Retrying token pool creation...", {
            description: `Attempt ${retries + 1} of ${MAX_RETRIES}: The pool may already exist or there was a temporary issue.`
          });
          
          // Wait a moment and retry
          setTimeout(() => {
            createTokenPool(mintAddress, walletPublicKey);
          }, 2000);
          
          return false;
        }
        
        // Special case: If we're simulating and the pool might already exist
        // proceed to the next step as if creation was successful
        if (error.message.includes("already registered with Light Protocol") ||
            error.message.includes("already exists")) {
          console.log("Token appears to be already registered, continuing...");
          toast.success("Token Pool Verified", {
            description: "This token is already registered with Light Protocol."
          });
          setStep(CreationStep.POOL_CREATED);
          return true;
        }
      }
      
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
