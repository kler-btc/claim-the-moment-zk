
import { useState } from 'react';
import { toast } from 'sonner';
import { CreationStep } from './useEventCreationState';

export const useQRGeneration = (setStep: (step: CreationStep) => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const generateQRCode = async (eventId: string | null) => {
    if (!eventId) {
      toast.error("Cannot generate QR code", {
        description: "Missing event information"
      });
      return false;
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
      return true;
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Error generating QR code", {
        description: "Failed to generate QR code. Please try again."
      });
      return false;
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
    link.download = `event-qr-code.png`;
    link.href = url;
    link.click();
  };

  return {
    isLoading,
    qrCodeUrl,
    generateQRCode,
    downloadQRCode
  };
};
