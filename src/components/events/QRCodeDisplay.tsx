
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface QRCodeDisplayProps {
  qrCodeUrl: string | null;
  mintAddress: string | null;
  eventId: string | null;
  transactionId: string | null;
  onDownload: () => void;
}

const QRCodeDisplay = ({ 
  qrCodeUrl, 
  mintAddress, 
  eventId,
  transactionId,
  onDownload 
}: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: `${label} copied to clipboard!` });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getExplorerUrl = (address: string, type: 'tx' | 'address') => {
    return `https://explorer.solana.com/${type}/${address}?cluster=devnet`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code</CardTitle>
        <CardDescription>
          For attendees to claim their tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
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

        {eventId && (
          <div className="w-full p-3 bg-muted rounded-md flex items-center justify-between">
            <div className="truncate max-w-[70%]">
              <p className="text-xs font-medium mb-0.5">Event ID (for manual entry):</p>
              <p className="text-sm font-mono truncate">{eventId}</p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => copyToClipboard(eventId, 'Event ID')}
              className="flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {mintAddress && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Token Mint Address:</p>
              <a 
                href={getExplorerUrl(mintAddress, 'address')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center"
              >
                View <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            </div>
            <div className="flex items-center space-x-1">
              <p className="text-xs font-mono truncate">{mintAddress}</p>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => copyToClipboard(mintAddress, 'Mint address')}
                className="flex-shrink-0 h-6 w-6"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {transactionId && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Transaction:</p>
              <a 
                href={getExplorerUrl(transactionId, 'tx')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center"
              >
                View on Explorer <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            </div>
            <p className="text-xs font-mono truncate">{transactionId}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onDownload} 
          disabled={!qrCodeUrl} 
          variant="outline"
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" /> Download QR Code
        </Button>
      </CardFooter>
    </Card>
  );
};

export default QRCodeDisplay;
