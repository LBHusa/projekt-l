'use client';

import { Check } from 'lucide-react';

interface Step {
  id: string;
  name: string;
  required: boolean;
}

interface OnboardingProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export default function OnboardingProgress({
  steps,
  currentStep,
  onStepClick,
}: OnboardingProgressProps) {
  return (
    <div className="sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isRequired = step.required;

            return (
              <button
                key={step.id}
                onClick={() => onStepClick(index)}
                className={`relative flex items-center justify-center transition-all ${
                  isActive
                    ? 'scale-110'
                    : isCompleted
                    ? 'hover:scale-105'
                    : 'opacity-50'
                }`}
                title={step.name}
              >
                {/* Dot */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/30'
                      : isCompleted
                      ? 'bg-green-500'
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Required indicator */}
                {isRequired && !isCompleted && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-full w-2 h-0.5 ${
                      index < currentStep ? 'bg-green-500' : 'bg-white/10'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Current step name */}
        <p className="text-center mt-2 text-sm text-adaptive-muted">
          {steps[currentStep].name}
          {steps[currentStep].required && (
            <span className="text-amber-400 ml-1">*</span>
          )}
        </p>
      </div>
    </div>
  );
}
