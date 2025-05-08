
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createCompressedToken, EventDetails } from '@/utils/compressionUtils';

const CreateEventPage = () => {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    location: '',
    date: '',
    time: '',
    description: '',
    attendeeCount: 50, // Default value
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({
      ...prev,
      [name]: name === 'attendeeCount' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create an event",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (eventDetails.title.trim() === '' || 
        eventDetails.location.trim() === '' || 
        eventDetails.date.trim() === '' ||
        eventDetails.time.trim() === '' ||
        eventDetails.attendeeCount <= 0) {
      toast({
        title: "Invalid Event Details",
        description: "Please fill in all required fields with valid information.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the real ZK compression implementation
      const compressionResult = await createCompressedToken(
        eventDetails, 
        publicKey.toString()
      );
      
      // Generate the full claim URL with the host
      const claimUrl = `${window.location.origin}${compressionResult.claimUrl}`;
      setQrCodeUrl(claimUrl);
      setMintAddress(compressionResult.mintAddress || null);
      
      toast({
        title: "Event created successfully!",
        description: "Compressed token minted with ZK compression on Solana devnet.",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error creating event",
        description: error instanceof Error ? error.message : "Failed to mint compressed token. Please try again.",
        variant: "destructive",
      });
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
    link.download = `${eventDetails.title.replace(/\s+/g, '-')}-qr-code.png`;
    link.href = url;
    link.click();
  };

  if (!connected) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <Alert variant="default" className="border-primary/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>
            Please connect your Solana wallet to create events and mint tokens.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create Event</h1>
        <p className="text-muted-foreground">
          Generate compressed tokens for your event attendees using Light Protocol's ZK compression
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Fill in your event information to create compressed tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Name</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Solana Hackathon 2025"
                    value={eventDetails.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Virtual or Physical Address"
                      value={eventDetails.location}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={eventDetails.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        name="time"
                        type="time"
                        value={eventDetails.time}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Tell us about your event..."
                    value={eventDetails.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="attendeeCount">Number of Attendees (Token Supply)</Label>
                  <Input
                    id="attendeeCount"
                    name="attendeeCount"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="100"
                    value={eventDetails.attendeeCount || ''}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This determines how many compressed tokens will be minted
                  </p>
                </div>
              
                <Button 
                  type="submit" 
                  className="solana-gradient-bg w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Compressed Token...</>
                  ) : (
                    "Create Event & Generate QR"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>
                For attendees to claim their tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div id="qr-code" className="bg-white p-4 rounded-md">
                {qrCodeUrl ? (
                  <QRCodeSVG 
                    value={qrCodeUrl} 
                    size={180}
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-[180px] h-[180px] bg-muted flex items-center justify-center text-center text-sm text-muted-foreground p-4">
                    QR code will appear here after creating an event
                  </div>
                )}
              </div>
            </CardContent>
            {mintAddress && (
              <div className="px-6 pb-2">
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold">Token Mint:</span> {mintAddress}
                </p>
              </div>
            )}
            <CardFooter>
              <Button 
                onClick={downloadQRCode} 
                disabled={!qrCodeUrl} 
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" /> Download QR Code
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
