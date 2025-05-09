
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
        toast.error("Event Not Found", {
          description: "The event you're looking for doesn't exist or has been removed."
        });
        navigate('/claim');
        return;
      }
      
      console.log('Event data retrieved:', data);
      
      // Check if this event has an associated token pool
      const poolStorageKey = `pool-${data.mintAddress}`;
      const poolData = localStorage.getItem(poolStorageKey);
      
      // Add pool data to event data if available
      if (poolData) {
        const poolInfo = JSON.parse(poolData);
        data.poolAddress = poolInfo.poolAddress;
        data.poolTransactionId = poolInfo.transactionId;
      }
      
      setEventData(data);
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
