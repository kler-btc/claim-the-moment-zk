
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import TokenDetails from '@/components/token/TokenDetails';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PoolCreatedCardProps {
  title: string;
  symbol?: string;
  mintAddress: string;
  poolTransactionId: string;
  isLoading: boolean;
  onGenerateQR: () => void;
}

export const PoolCreatedCard: React.FC<PoolCreatedCardProps> = ({
  title,
  symbol,
  mintAddress,
  poolTransactionId,
  isLoading,
  onGenerateQR,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Pool Created!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TokenDetails 
          title={title}
          symbol={symbol}
          mintAddress={mintAddress}
          poolTransactionId={poolTransactionId}
          variant="compact"
        />
        
        <p className="text-sm text-muted-foreground">
          Now, let's generate a QR code that attendees can scan to claim tokens.
        </p>
        
        <Button 
          className="w-full" 
          onClick={onGenerateQR}
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating QR Code...</>
          ) : (
            "Generate QR Code"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
