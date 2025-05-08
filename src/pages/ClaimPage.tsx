import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import QrReader from 'react-qr-scanner';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { claimEventToken } from '@/utils/eventServices';
import { verifyTokenClaim } from '@/utils/compressionApi';
import { getEventDetails } from '@/utils/eventServices';
import { useCamera } from '@/hooks/use-camera';

const ClaimPage = () => {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const { eventId } = useParams<{ eventId?: string }>();
  const { hasPermission, isLoading: cameraLoading, requestPermission } = useCamera();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualEventId, setManualEventId] = useState('');

  // Check if we have an event ID from the URL
  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId);
    }
  }, [eventId]);

  // Check if user has already claimed this event's token
  useEffect(() => {
    if (eventId && connected && publicKey) {
      checkIfClaimed();
    }
  }, [eventId, connected, publicKey]);

  const fetchEventDetails = async (id: string) => {
    try {
      // Get event details from the service
      const parsedData = await getEventDetails(id);
      
      if (parsedData) {
        setEventData({
          title: parsedData.title,
          organizer: parsedData.creator ? parsedData.creator.substring(0, 6) + '...' + parsedData.creator.substring(parsedData.creator.length - 4) : 'Unknown',
          date: new Date(parsedData.createdAt).toLocaleDateString(),
          location: 'Solana Devnet',
          mintAddress: parsedData.mintAddress,
          stateTreeAddress: parsedData.stateTreeAddress,
        });
      } else {
        toast({
          title: "Event Not Found",
          description: "Could not find details for this event.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error Loading Event",
        description: "Could not load event details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkIfClaimed = async () => {
    if (!eventId || !publicKey) return;
    
    setIsVerifying(true);
    try {
      const claimed = await verifyTokenClaim(
        eventId, 
        publicKey.toString()
      );
      setHasClaimed(claimed);
    } catch (error) {
      console.error("Error checking claim status:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScan = (data: { text: string } | null) => {
    if (data && data.text) {
      setIsScanning(false);
      
      try {
        // Try to parse the QR data as JSON first
        try {
          const jsonData = JSON.parse(data.text);
          if (jsonData.eventId) {
            window.location.href = `/claim/${jsonData.eventId}`;
            return;
          }
        } catch (e) {
          // Not JSON, continue with URL parsing
        }
        
        // Parse as URL
        try {
          const url = new URL(data.text);
          const pathParts = url.pathname.split('/');
          if (pathParts.includes('claim') && pathParts.length > 2) {
            const scannedEventId = pathParts[pathParts.indexOf('claim') + 1];
            window.location.href = `/claim/${scannedEventId}`;
          } else {
            toast({
              title: "Invalid QR Code",
              description: "This QR code doesn't contain a valid claim link.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error Scanning QR",
            description: "The QR code couldn't be processed. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error processing QR code:", error);
        toast({
          title: "Error Processing QR",
          description: "Could not process the QR code data. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast({
      title: "Camera Error",
      description: "There was an error accessing your camera. Please check permissions.",
      variant: "destructive",
    });
    setIsScanning(false);
  };

  const handleClaimToken = async () => {
    if (!connected || !publicKey || !eventId) {
      toast({
        title: "Cannot Claim Token",
        description: connected ? "Invalid event data." : "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);

    try {
      // Use the event service to claim the token
      const success = await claimEventToken(
        eventId,
        publicKey.toString()
      );
      
      if (success) {
        toast({
          title: "Token Claimed Successfully!",
          description: "The compressed token has been added to your wallet.",
        });
        setHasClaimed(true);
      }
    } catch (error) {
      console.error("Error claiming token:", error);
      toast({
        title: "Error Claiming Token",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEventId.trim()) {
      window.location.href = `/claim/${manualEventId.trim()}`;
    }
  };

  const startCameraWithPermission = async () => {
    const hasAccess = await requestPermission();
    if (hasAccess) {
      setIsScanning(true);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Claim Event Token</h1>
        <p className="text-muted-foreground">
          Scan a QR code or use your claim link
        </p>
      </div>

      {!connected && (
        <Alert variant="default" className="border-primary/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>
            Please connect your Solana wallet to claim your event token.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        {!eventId ? (
          <>
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
                    onError={handleError}
                    onScan={handleScan}
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
                <form onSubmit={handleManualSubmit} className="w-full space-y-2">
                  <input
                    type="text"
                    placeholder="Enter Event ID"
                    className="w-full px-3 py-2 border rounded-md"
                    value={manualEventId}
                    onChange={(e) => setManualEventId(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full">Submit</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setManualEntryMode(false)}
                  >
                    Back to Scanner
                  </Button>
                </form>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setManualEntryMode(true)}
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
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Claim Your Token</CardTitle>
              <CardDescription>
                Connect your wallet and claim your event token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventData && (
                <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">Event:</p>
                    <p className="text-sm font-medium text-right">{eventData.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">Organizer:</p>
                    <p className="text-sm font-medium text-right">{eventData.organizer}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">Date:</p>
                    <p className="text-sm font-medium text-right">{eventData.date}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">Location:</p>
                    <p className="text-sm font-medium text-right">{eventData.location}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">Token:</p>
                    <p className="text-sm font-medium text-right truncate" title={eventData.mintAddress}>
                      {eventData.mintAddress ? `${eventData.mintAddress.substring(0, 4)}...${eventData.mintAddress.substring(eventData.mintAddress.length - 4)}` : 'Unknown'}
                    </p>
                  </div>
                </div>
              )}
              
              {isVerifying ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : hasClaimed ? (
                <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-900">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle>Already Claimed</AlertTitle>
                  <AlertDescription>
                    You have already claimed this event token!
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleClaimToken}
                className="solana-gradient-bg w-full"
                disabled={isClaiming || !connected || hasClaimed === true}
              >
                {isClaiming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming...</>
                ) : hasClaimed ? (
                  <><Check className="mr-2 h-4 w-4" /> Token Claimed</>
                ) : (
                  "Claim Token"
                )}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default ClaimPage;
