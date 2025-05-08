
import React, { useState } from 'react';
import { EventDetails } from '@/utils/types';

export const useEventForm = () => {
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    location: '',
    date: '',
    time: '',
    description: '',
    attendeeCount: 50, // Default value
    symbol: '',
    decimals: 0,
    imageUrl: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({
      ...prev,
      [name]: name === 'attendeeCount' || name === 'decimals' ? parseInt(value) || 0 : value,
    }));
  };

  return {
    eventDetails,
    setEventDetails,
    handleInputChange
  };
};
