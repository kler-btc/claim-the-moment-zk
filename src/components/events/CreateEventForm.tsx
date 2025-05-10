
import React, { useState } from 'react';
import { EventDetails } from '@/utils/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';

interface CreateEventFormProps {
  eventDetails: EventDetails;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const CreateEventForm = ({ 
  eventDetails, 
  isLoading, 
  onSubmit, 
  onChange 
}: CreateEventFormProps) => {
  const [showMetadataPreview, setShowMetadataPreview] = useState(false);

  const toggleMetadataPreview = () => {
    setShowMetadataPreview(!showMetadataPreview);
  };

  // Helper for validating field lengths
  const isSymbolTooLong = eventDetails.symbol.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
        <CardDescription>
          Fill in your event information to create compressed tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input
              id="title"
              name="title"
              placeholder="Solana Hackathon 2025"
              value={eventDetails.title}
              onChange={onChange}
              maxLength={32} // Token-2022 name limit
              required
            />
            {eventDetails.title.length > 25 && (
              <p className="text-xs text-amber-500">
                {32 - eventDetails.title.length} characters remaining
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Virtual or Physical Address"
                value={eventDetails.location}
                onChange={onChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={eventDetails.date}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={eventDetails.time}
                  onChange={onChange}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell us about your event..."
              value={eventDetails.description}
              onChange={onChange}
              rows={3}
            />
          </div>

          {/* Token Metadata Fields with improved validation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={isSymbolTooLong ? "text-red-500" : ""}>Token Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="EVNT"
                maxLength={10}
                value={eventDetails.symbol}
                onChange={onChange}
                className={isSymbolTooLong ? "border-red-500" : ""}
                required
              />
              <p className={`text-xs ${isSymbolTooLong ? "text-red-500" : "text-muted-foreground"}`}>
                Short symbol for the token (max 10 characters)
                {isSymbolTooLong && " - Symbol is too long"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Token Decimals</Label>
              <Input
                id="decimals"
                name="decimals"
                type="number"
                min="0"
                max="9"
                placeholder="0"
                value={eventDetails.decimals || 0}
                onChange={onChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Usually 0 for NFTs and event tokens
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Token Image URL</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://example.com/image.png"
              value={eventDetails.imageUrl}
              onChange={onChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Link to an image for the token (IPFS or https URL)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Number of Attendees (Token Supply)</Label>
            <Input
              id="attendeeCount"
              name="attendeeCount"
              type="number"
              min="1"
              max="1000" // Set lower max for testing
              placeholder="100"
              value={eventDetails.attendeeCount || ''}
              onChange={onChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              This determines how many compressed tokens will be minted (max 1000 for testing)
            </p>
          </div>
        
          {showMetadataPreview && (
            <div className="p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-2">Metadata Preview</h4>
              <pre className="text-xs overflow-auto max-h-[200px] p-2 bg-black/5 rounded">
                {JSON.stringify({
                  name: eventDetails.title,
                  symbol: eventDetails.symbol || 'TOKEN',
                  description: eventDetails.description,
                  image: eventDetails.imageUrl,
                  attributes: [
                    { trait_type: 'Event Date', value: eventDetails.date },
                    { trait_type: 'Event Time', value: eventDetails.time },
                    { trait_type: 'Location', value: eventDetails.location },
                    { trait_type: 'Supply', value: eventDetails.attendeeCount }
                  ]
                }, null, 2)}
              </pre>
            </div>
          )}

          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={toggleMetadataPreview}
          >
            {showMetadataPreview ? 'Hide Metadata Preview' : 'Show Metadata Preview'}
          </Button>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || isSymbolTooLong}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Compressed Token...</>
            ) : (
              "Create Event & Generate QR"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateEventForm;
