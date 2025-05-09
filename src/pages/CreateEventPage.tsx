
import { useWallet } from '@solana/wallet-adapter-react';
import CreateEventForm from '@/components/events/CreateEventForm';
import QRCodeDisplay from '@/components/events/QRCodeDisplay';
import WalletAlert from '@/components/events/WalletAlert';
import { useCreateEvent, CreationStep } from '@/hooks/useCreateEvent';
import { ProgressIndicator } from '@/components/events/ProgressIndicator';
import { TokenCreatedCard } from '@/components/events/TokenCreatedCard';
import { PoolCreatedCard } from '@/components/events/PoolCreatedCard';
import { SetupCompleteCard } from '@/components/events/SetupCompleteCard';

const CreateEventPage = () => {
  const { connected, publicKey } = useWallet();
  const { 
    eventDetails, 
    isLoading, 
    qrCodeUrl, 
    mintAddress, 
    eventId,
    transactionId,
    poolTransactionId,
    step,
    handleInputChange, 
    handleCreateEvent,
    handleCreateTokenPool,
    handleGenerateQR,
    downloadQRCode 
  } = useCreateEvent(publicKey?.toString() || null);

  // Wrapper function to handle Promise<boolean> to Promise<void> conversion
  const onSubmit = async (e: React.FormEvent) => {
    await handleCreateEvent(e);
    return;
  };

  if (!connected) {
    return <WalletAlert />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create Event</h1>
        <p className="text-muted-foreground">
          Generate compressed tokens for your event attendees using Light Protocol's ZK compression
        </p>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator step={step} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 md:col-span-2">
          {/* Step 1: Create Token */}
          {(step === CreationStep.INITIAL || step === CreationStep.CREATING_TOKEN) && (
            <CreateEventForm 
              eventDetails={eventDetails}
              isLoading={isLoading}
              onSubmit={onSubmit}
              onChange={handleInputChange}
            />
          )}
          
          {/* Step 2: Create Pool */}
          {step === CreationStep.TOKEN_CREATED && (
            <TokenCreatedCard
              title={eventDetails.title}
              symbol={eventDetails.symbol}
              mintAddress={mintAddress}
              transactionId={transactionId}
              isLoading={isLoading}
              onCreatePool={handleCreateTokenPool}
            />
          )}
          
          {/* Step 3: Generate QR */}
          {step === CreationStep.POOL_CREATED && (
            <PoolCreatedCard
              title={eventDetails.title}
              symbol={eventDetails.symbol} 
              mintAddress={mintAddress}
              poolTransactionId={poolTransactionId}
              isLoading={isLoading}
              onGenerateQR={handleGenerateQR}
            />
          )}
          
          {/* Step Complete */}
          {step === CreationStep.COMPLETE && (
            <SetupCompleteCard eventDetails={eventDetails} />
          )}
        </div>
        
        <div>
          <QRCodeDisplay 
            qrCodeUrl={qrCodeUrl}
            mintAddress={mintAddress}
            eventId={eventId}
            transactionId={transactionId}
            onDownload={downloadQRCode}
            step={step}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
