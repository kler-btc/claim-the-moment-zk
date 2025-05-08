
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const WalletConnectAlert = () => {
  return (
    <Alert variant="default" className="border-primary/50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Wallet not connected</AlertTitle>
      <AlertDescription>
        Please connect your Solana wallet to claim your event token.
      </AlertDescription>
    </Alert>
  );
};

export default WalletConnectAlert;
