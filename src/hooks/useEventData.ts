
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getEventDetails } from '@/utils/eventServices';
import { eventService, poolService } from '@/lib/db';

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
      
      // Get event data from our persistent database
      const data = await eventService.getEventById(id);
      
      if (!data) {
        console.error('Event not found');
        toast.error("Event Not Found", {
          description: "The event you're looking for doesn't exist or has been removed."
        });
        navigate('/claim');
        return;
      }
      
      console.log('Event data retrieved:', data);
      
      // Check if this event has an associated token pool
      const poolData = await poolService.getPoolByEventId(id);
      
      // Add pool data to event data if available
      const eventWithPool = {
        ...data,
        poolAddress: poolData?.poolAddress,
        poolTransactionId: poolData?.transactionId
      };
      
      setEventData(eventWithPool);
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast.error("Error", {
        description: "Failed to load event information. Please try again."
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
