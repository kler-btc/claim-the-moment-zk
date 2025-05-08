
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCodeUrl: string | null;
  mintAddress: string | null;
  onDownload: () => void;
}

const QRCodeDisplay = ({ qrCodeUrl, mintAddress, onDownload }: QRCodeDisplayProps) => {
  return (
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
