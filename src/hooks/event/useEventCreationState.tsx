
import { useState } from 'react';

// Step enum to track creation process
export enum CreationStep {
  INITIAL = 'initial',
  CREATING_TOKEN = 'creating_token',
  TOKEN_CREATED = 'token_created',
  CREATING_POOL = 'creating_pool',
  POOL_CREATED = 'pool_created',
  GENERATING_QR = 'generating_qr',
  COMPLETE = 'complete'
}

export const useEventCreationState = () => {
  const [step, setStep] = useState<CreationStep>(CreationStep.INITIAL);

  return {
    step,
    setStep
  };
};
