
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type StepIndicatorProps = { 
  stepNumber: number; 
  title: string; 
  active: boolean; 
  completed: boolean;
}

export const StepIndicator = ({ 
  stepNumber, 
  title, 
  active, 
  completed 
}: StepIndicatorProps) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          completed ? 'bg-green-600 text-white' : 
          active ? 'bg-primary text-white' : 
          'bg-muted text-muted-foreground'
        }`}
      >
        {stepNumber}
      </div>
      <span className={`text-xs ${active ? 'text-primary font-medium' : completed ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
        {title}
      </span>
    </div>
  );
};

export const StepSeparator = ({ active }: { active: boolean }) => {
  return (
    <div className="flex-1 mx-2">
      <Separator className={cn(active ? 'bg-primary' : 'bg-muted')} />
    </div>
  );
};
