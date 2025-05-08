
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import QrReader from 'react-qr-scanner';
import { AlertCircle } from 'lucide-react';

const ClaimPage = () => {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const { eventId } = useParams<{ eventId?: string }>();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  // Check if we have an event ID from the URL
  useEffect(() => {
    if (eventId) {
      // In a real app, we would fetch event details from the blockchain or API
      // For now, we'll use mock data
      setEventData({
        title: "Solana Hackathon 2025",
        organizer: "Solana Foundation",
        date: "June 15, 2025",
        location: "Virtual",
      });
    }
  }, [eventId]);

  const handleScan = (data: { text: string } | null) => {
    if (data && data.text) {
      setIsScanning(false);
      
      // Parse the URL to extract the event ID
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
    if (!connected || !eventId) {
      toast({
        title: "Cannot Claim Token",
        description: connected ? "Invalid event data." : "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);

    try {
      // Mock implementation - will integrate with Light Protocol SDK later
      console.log(`Claiming token for event ${eventId} with wallet ${publicKey?.toString()}`);
      
      // Simulate blockchain interaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Token Claimed Successfully!",
        description: "The event token has been added to your wallet.",
      });
      
      // In a real implementation, we would update UI to show the token details
    } catch (error) {
      console.error("Error claiming token:", error);
      toast({
        title: "Error Claiming Token",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
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
            <CardContent className="flex flex-col items-center">
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
                  Click "Start Scanning" to activate your camera
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setIsScanning(!isScanning)}
                className={isScanning ? "bg-destructive hover:bg-destructive/90 w-full" : "solana-gradient-bg w-full"}
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
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleClaimToken}
                className="solana-gradient-bg w-full"
                disabled={isClaiming || !connected}
              >
                {isClaiming ? "Claiming..." : "Claim Token"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default ClaimPage;
