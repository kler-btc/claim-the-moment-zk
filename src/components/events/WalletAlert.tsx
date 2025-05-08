
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const WalletAlert = () => {
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
};

export default WalletAlert;
