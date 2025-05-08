
import { useState } from 'react';
import { useQrScanner } from './useQrScanner';
import { useEventData } from './useEventData';
import { useTokenClaiming } from './useTokenClaiming';

export const useClaimToken = (initialEventId: string | undefined) => {
  const [eventId, setEventId] = useState<string | undefined>(initialEventId);
  
  const {
    isScanning,
    manualEntryMode,
    manualEventId,
    scanError,
    handleScan,
    handleError,
    handleManualSubmit,
    setManualEventId,
    toggleManualEntryMode,
    startScanning,
    stopScanning
  } = useQrScanner();
  
  const {
    eventData,
    isVerifying
  } = useEventData(eventId);
  
  const {
    connected,
    isClaiming,
    hasClaimed,
    handleClaimToken
  } = useTokenClaiming(eventId);

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
