
import React from 'react';

interface ClaimContainerProps {
  children: React.ReactNode;
}

const ClaimContainer = ({ children }: ClaimContainerProps) => {
  return (
    <div className="max-w-md mx-auto space-y-8">
      {children}
    </div>
  );
};

export default ClaimContainer;
