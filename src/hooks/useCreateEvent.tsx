
import { useWallet } from '@solana/wallet-adapter-react';
import { useEventForm } from './event/useEventForm';
import { useTokenCreation } from './event/useTokenCreation';
import { useTokenPool } from './event/useTokenPool';
import { useQRGeneration } from './event/useQRGeneration';
import { useEventCreationState, CreationStep } from './event/useEventCreationState';

// Re-export CreationStep enum for use in components
export { CreationStep } from './event/useEventCreationState';

export const useCreateEvent = (walletPublicKey: string | null) => {
  const { publicKey } = useWallet();
  const { step, setStep } = useEventCreationState();
  const { eventDetails, handleInputChange } = useEventForm();
  
  const { 
    isLoading: tokenCreationLoading,
    mintAddress,
    eventId,
    transactionId,
    createToken
  } = useTokenCreation(setStep, walletPublicKey);
  
  const {
    isLoading: poolCreationLoading,
    poolTransactionId,
    createTokenPool
  } = useTokenPool(setStep);
  
  const {
    isLoading: qrGenerationLoading,
    qrCodeUrl,
    generateQRCode,
    downloadQRCode
  } = useQRGeneration(setStep);

  // Combine loading states
  const isLoading = tokenCreationLoading || poolCreationLoading || qrGenerationLoading;

  // Handle form submission for token creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    return await createToken(eventDetails, e);
  };

  // Handle token pool creation
  const handleCreateTokenPool = async () => {
    return await createTokenPool(mintAddress, walletPublicKey);
  };

  // Handle QR code generation
  const handleGenerateQR = async () => {
    return await generateQRCode(eventId);
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
