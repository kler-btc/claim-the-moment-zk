
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import TokenDetails from '@/components/token/TokenDetails';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TokenCreatedCardProps {
  title: string;
  symbol?: string;
  mintAddress: string;
  transactionId: string;
  isLoading: boolean;
  onCreatePool: () => void;
}

export const TokenCreatedCard: React.FC<TokenCreatedCardProps> = ({
  title,
  symbol,
  mintAddress,
  transactionId,
  isLoading,
  onCreatePool,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Created Successfully!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TokenDetails 
          title={title}
          symbol={symbol}
          mintAddress={mintAddress}
          transactionId={transactionId}
          variant="compact"
        />
        
        <p className="text-sm text-muted-foreground">
          Next, let's create a token pool for compression using Light Protocol.
        </p>
        
        <Button 
          className="w-full" 
          onClick={onCreatePool}
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Token Pool...</>
          ) : (
            "Create Token Pool"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
