
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { getEventDetails } from '@/utils/eventServices';

export const useEventData = (eventId: string | undefined) => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  // Effect to fetch event data when eventId changes
  useEffect(() => {
    if (eventId) {
      fetchEventData(eventId);
    }
  }, [eventId]);

  const fetchEventData = async (id: string) => {
    setIsVerifying(true);
    try {
      console.log('Fetching event data for ID:', id);
      const data = await getEventDetails(id);
      
      if (!data) {
        console.error('Event not found');
        toast({
          title: "Event Not Found",
          description: "The event you're looking for doesn't exist or has been removed.",
          variant: "destructive",
        });
        navigate('/claim');
        return;
      }
      
      console.log('Event data retrieved:', data);
      setEventData(data);
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event information. Please try again.",
        variant: "destructive",
      });
      navigate('/claim');
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    eventData,
    isVerifying,
  };
};
