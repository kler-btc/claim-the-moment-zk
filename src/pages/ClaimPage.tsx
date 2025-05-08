
import { useParams } from 'react-router-dom';
import { useClaimToken } from '@/hooks/useClaimToken';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import QRScanner from '@/components/claim/QRScanner';
import ClaimTokenCard from '@/components/claim/ClaimTokenCard';

const ClaimPage = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const {
    isScanning,
    isClaiming,
    isVerifying,
    eventData,
    hasClaimed,
    manualEntryMode,
    manualEventId,
    connected,
    handleScan,
    handleError,
    handleClaimToken,
    handleManualSubmit,
    setManualEventId,
    toggleManualEntryMode,
    startScanning,
    stopScanning
  } = useClaimToken(eventId);

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

      {!eventId ? (
        <QRScanner
          isScanning={isScanning}
          manualEntryMode={manualEntryMode}
          onScan={handleScan}
          onError={handleError}
          onStartScanning={startScanning}
          onToggleManual={toggleManualEntryMode}
          manualEventId={manualEventId}
          onManualChange={(e) => setManualEventId(e.target.value)}
          onManualSubmit={handleManualSubmit}
        />
      ) : (
        <ClaimTokenCard
          eventData={eventData}
          isVerifying={isVerifying}
          isClaiming={isClaiming}
          hasClaimed={hasClaimed}
          walletConnected={connected}
          onClaimToken={handleClaimToken}
        />
      )}
    </div>
  );
};

export default ClaimPage;
