
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Camera } from 'lucide-react';
import QrReader from 'react-qr-scanner';
import { useCamera } from '@/hooks/use-camera';

interface QRScannerProps {
  isScanning: boolean;
  manualEntryMode: boolean;
  onScan: (data: { text: string } | null) => void;
  onError: (error: any) => void;
  onStartScanning: () => void;
  onToggleManual: () => void;
  manualEventId: string;
  onManualChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualSubmit: (e: React.FormEvent) => void;
}

const QRScanner = ({
  isScanning,
  manualEntryMode,
  onScan,
  onError,
  onStartScanning,
  onToggleManual,
  manualEventId,
  onManualChange,
  onManualSubmit
}: QRScannerProps) => {
  const { hasPermission, isLoading: cameraLoading, requestPermission } = useCamera();
  const [scanError, setScanError] = useState<string | null>(null);

  // Reset error when scanning state changes
  useEffect(() => {
    if (isScanning) {
      setScanError(null);
    }
  }, [isScanning]);

  const startCameraWithPermission = async () => {
    try {
      setScanError(null);
      const hasAccess = await requestPermission();
      if (hasAccess) {
        onStartScanning();
      }
    } catch (error) {
      setScanError(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleScanError = (error: any) => {
    setScanError(`Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    onError(error);
  };

  // Custom scan handler with debugging
  const handleScan = (data: any) => {
    if (data) {
      console.log("QR scan data received:", data);
      onScan(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan QR Code</CardTitle>
        <CardDescription>
          Scan the event QR code with your device camera
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {isScanning ? (
          <div className="w-full max-w-[280px] h-[280px] overflow-hidden rounded-md bg-black relative">
            <QrReader
              delay={300}
              onError={handleScanError}
              onScan={handleScan}
              style={{ width: '100%' }}
              constraints={{ 
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
              }}
              className="absolute inset-0"
            />
            {scanError && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
                <div className="text-white text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-sm">{scanError}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-[280px] h-[280px] bg-muted rounded-md flex items-center justify-center text-center text-sm text-muted-foreground p-4">
            {cameraLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : hasPermission === false ? (
              <div className="space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                <p>Camera permission denied. Please use manual entry instead.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Camera className="h-12 w-12 text-primary/50 mx-auto" />
                <p>Click "Start Scanning" to activate your camera</p>
              </div>
            )}
          </div>
        )}
        
        {manualEntryMode ? (
          <form onSubmit={onManualSubmit} className="w-full space-y-2">
            <input
              type="text"
              placeholder="Enter Event ID"
              className="w-full px-3 py-2 border rounded-md"
              value={manualEventId}
              onChange={onManualChange}
              required
            />
            <Button type="submit" className="w-full">Submit</Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onToggleManual}
            >
              Back to Scanner
            </Button>
          </form>
        ) : (
          <div className="w-full">
            {scanError && (
              <div className="text-red-500 text-sm mb-2 text-center">
                {scanError}
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={onToggleManual}
              className="w-full"
            >
              Enter Event ID Manually
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={startCameraWithPermission}
          className={isScanning ? "bg-destructive hover:bg-destructive/90 w-full" : "bg-primary w-full"}
          disabled={isScanning || hasPermission === false || manualEntryMode || cameraLoading}
        >
          {isScanning ? (
            <>Stop Scanning</>
          ) : cameraLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Camera...</>
          ) : (
            <>Start Scanning</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default QRScanner;
