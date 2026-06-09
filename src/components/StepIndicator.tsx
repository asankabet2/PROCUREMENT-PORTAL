import React from 'react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i < currentStep ? 'bg-success text-success-foreground' :
              i === currentStep ? 'bg-primary text-primary-foreground animate-pulse-glow' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-16 ${i < currentStep ? 'bg-success' : 'bg-muted'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
