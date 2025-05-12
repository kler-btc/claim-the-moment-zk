import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useQrScanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualEventId, setManualEventId] = useState('');

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
    if (error?.name === 'NotFoundError') {
      setScanError('Camera not found or not accessible.');
    } else if (error?.name === 'NotAllowedError') {
      setScanError('Camera access denied. Please check your browser settings.');
    } else if (error?.name === 'NotReadableError') {
      setScanError('Camera is already in use by another application.');
    } else if (error?.message?.includes('constraints')) {
      setScanError('Camera configuration issue. Try using manual entry instead.');
    } else {
      setScanError(`Scanner error: ${error?.message || 'Unknown error'}`);
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
    setScanError(null);
    if (isScanning) {
      setIsScanning(false);
    }
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
  };
};
