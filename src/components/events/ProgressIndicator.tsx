
import React from 'react';
import { CreationStep } from '@/hooks/event/useEventCreationState';
import { StepIndicator, StepSeparator } from './StepIndicator';

interface ProgressIndicatorProps {
  step: CreationStep;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ step }) => {
  return (
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
  );
};
