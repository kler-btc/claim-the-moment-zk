
import { useWallet } from '@solana/wallet-adapter-react';
import CreateEventForm from '@/components/events/CreateEventForm';
import QRCodeDisplay from '@/components/events/QRCodeDisplay';
import WalletAlert from '@/components/events/WalletAlert';
import { useCreateEvent } from '@/hooks/useCreateEvent';

const CreateEventPage = () => {
  const { connected, publicKey } = useWallet();
  const { 
    eventDetails, 
    isLoading, 
    qrCodeUrl, 
    mintAddress, 
    handleInputChange, 
    handleCreateEvent, 
    downloadQRCode 
  } = useCreateEvent(publicKey?.toString() || null);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 md:col-span-2">
          <CreateEventForm 
            eventDetails={eventDetails}
            isLoading={isLoading}
            onSubmit={handleCreateEvent}
            onChange={handleInputChange}
          />
        </div>
        
        <div>
          <QRCodeDisplay 
            qrCodeUrl={qrCodeUrl}
            mintAddress={mintAddress}
            onDownload={downloadQRCode}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
