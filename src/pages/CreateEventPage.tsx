
import { useWallet } from '@solana/wallet-adapter-react';
import CreateEventForm from '@/components/events/CreateEventForm';
import QRCodeDisplay from '@/components/events/QRCodeDisplay';
import WalletAlert from '@/components/events/WalletAlert';
import { useCreateEvent, CreationStep } from '@/hooks/useCreateEvent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
      <div className="flex items-center justify-between">
        <StepIndicator 
          stepNumber={1} 
          title="Create Token" 
          active={step === CreationStep.INITIAL || step === CreationStep.CREATING_TOKEN}
          completed={[
            CreationStep.TOKEN_CREATED, 
            CreationStep.CREATING_POOL, 
            CreationStep.POOL_CREATED,
            CreationStep.GENERATING_QR,
            CreationStep.COMPLETE
          ].includes(step)}
        />
        
        <StepSeparator active={step !== CreationStep.INITIAL} />
        
        <StepIndicator 
          stepNumber={2} 
          title="Create Pool" 
          active={step === CreationStep.TOKEN_CREATED || step === CreationStep.CREATING_POOL}
          completed={[
            CreationStep.POOL_CREATED,
            CreationStep.GENERATING_QR,
            CreationStep.COMPLETE
          ].includes(step)}
        />
        
        <StepSeparator active={step !== CreationStep.INITIAL && step !== CreationStep.TOKEN_CREATED} />
        
        <StepIndicator 
          stepNumber={3} 
          title="Generate QR" 
          active={step === CreationStep.POOL_CREATED || step === CreationStep.GENERATING_QR}
          completed={step === CreationStep.COMPLETE}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 md:col-span-2">
          {/* Step 1: Create Token */}
          {(step === CreationStep.INITIAL || step === CreationStep.CREATING_TOKEN) && (
            <CreateEventForm 
              eventDetails={eventDetails}
              isLoading={isLoading}
              onSubmit={handleCreateEvent}
              onChange={handleInputChange}
            />
          )}
          
          {/* Step 2: Create Pool */}
          {step === CreationStep.TOKEN_CREATED && (
            <Card>
              <CardHeader>
                <CardTitle>Token Created Successfully!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm mb-2"><span className="font-medium">Token Details:</span></p>
                  <p className="text-sm"><span className="font-medium">Name:</span> {eventDetails.title}</p>
                  <p className="text-sm"><span className="font-medium">Symbol:</span> {eventDetails.symbol}</p>
                  <p className="text-sm"><span className="font-medium">Mint Address:</span> {mintAddress}</p>
                  <p className="text-sm"><span className="font-medium">Transaction:</span> {transactionId}</p>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Next, let's create a token pool for compression using Light Protocol.
                </p>
                
                <Button 
                  className="w-full" 
                  onClick={handleCreateTokenPool}
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
          )}
          
          {/* Step 3: Generate QR */}
          {step === CreationStep.POOL_CREATED && (
            <Card>
              <CardHeader>
                <CardTitle>Token Pool Created!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm mb-2"><span className="font-medium">Pool Details:</span></p>
                  <p className="text-sm"><span className="font-medium">Token:</span> {eventDetails.title} ({eventDetails.symbol})</p>
                  <p className="text-sm"><span className="font-medium">Mint Address:</span> {mintAddress}</p>
                  <p className="text-sm"><span className="font-medium">Pool Transaction:</span> {poolTransactionId}</p>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Now, let's generate a QR code that attendees can scan to claim tokens.
                </p>
                
                <Button 
                  className="w-full" 
                  onClick={handleGenerateQR}
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
          )}
          
          {/* Step Complete */}
          {step === CreationStep.COMPLETE && (
            <Card>
              <CardHeader>
                <CardTitle>Setup Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-medium">Your event tokens are ready to distribute!</p>
                  <p className="text-sm text-green-700 mt-2">Share the QR code with your event attendees so they can claim their tokens.</p>
                </div>
                
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm mb-2"><span className="font-medium">Event Details:</span></p>
                  <p className="text-sm"><span className="font-medium">Name:</span> {eventDetails.title}</p>
                  <p className="text-sm"><span className="font-medium">Date:</span> {eventDetails.date} at {eventDetails.time}</p>
                  <p className="text-sm"><span className="font-medium">Location:</span> {eventDetails.location}</p>
                  <p className="text-sm"><span className="font-medium">Token Supply:</span> {eventDetails.attendeeCount}</p>
                </div>
              </CardContent>
            </Card>
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

// Step indicator component
const StepIndicator = ({ 
  stepNumber, 
  title, 
  active, 
  completed 
}: { 
  stepNumber: number; 
  title: string; 
  active: boolean; 
  completed: boolean;
}) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          completed ? 'bg-green-600 text-white' : 
          active ? 'bg-primary text-white' : 
          'bg-muted text-muted-foreground'
        }`}
      >
        {stepNumber}
      </div>
      <span className={`text-xs ${active ? 'text-primary font-medium' : completed ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
        {title}
      </span>
    </div>
  );
};

// Step separator
const StepSeparator = ({ active }: { active: boolean }) => {
  return (
    <div className="flex-1 mx-2">
      <Separator className={active ? 'bg-primary' : 'bg-muted'} />
    </div>
  );
};

export default CreateEventPage;
