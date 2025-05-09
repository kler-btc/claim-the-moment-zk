
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import TokenDetails from '@/components/token/TokenDetails';
import { EventDetails } from '@/utils/types';

interface SetupCompleteCardProps {
  eventDetails: EventDetails;
}

export const SetupCompleteCard: React.FC<SetupCompleteCardProps> = ({ eventDetails }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Complete!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">Your event tokens are ready to distribute!</p>
          <p className="text-sm text-green-700 mt-2">Share the QR code with your event attendees so they can claim their tokens.</p>
        </div>
        
        <TokenDetails 
          title={eventDetails.title}
          date={eventDetails.date}
          time={eventDetails.time}
          location={eventDetails.location}
          attendeeCount={eventDetails.attendeeCount}
          variant="full"
        />
      </CardContent>
    </Card>
  );
};
