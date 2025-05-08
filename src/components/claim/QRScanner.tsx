
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
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

  const startCameraWithPermission = async () => {
    const hasAccess = await requestPermission();
    if (hasAccess) {
      onStartScanning();
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
          <div className="w-full max-w-[280px] h-[280px] overflow-hidden rounded-md">
            <QrReader
              delay={300}
              onError={onError}
              onScan={onScan}
              style={{ width: '100%' }}
              constraints={{ facingMode: 'environment' }}
            />
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
              <p>Click "Start Scanning" to activate your camera</p>
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
          <Button 
            variant="outline" 
            onClick={onToggleManual}
            className="w-full"
          >
            Enter Event ID Manually
          </Button>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={startCameraWithPermission}
          className={isScanning ? "bg-destructive hover:bg-destructive/90 w-full" : "solana-gradient-bg w-full"}
          disabled={isScanning || hasPermission === false || manualEntryMode}
        >
          {isScanning ? "Stop Scanning" : "Start Scanning"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default QRScanner;
