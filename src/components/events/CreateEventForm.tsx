
import { EventDetails } from '@/utils/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              name="title"
              placeholder="Solana Hackathon 2025"
              value={eventDetails.title}
              onChange={onChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
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
                <Label htmlFor="date">Date</Label>
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
                <Label htmlFor="time">Time</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell us about your event..."
              value={eventDetails.description}
              onChange={onChange}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="attendeeCount">Number of Attendees (Token Supply)</Label>
            <Input
              id="attendeeCount"
              name="attendeeCount"
              type="number"
              min="1"
              max="1000"
              placeholder="100"
              value={eventDetails.attendeeCount || ''}
              onChange={onChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              This determines how many compressed tokens will be minted
            </p>
          </div>
        
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
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
