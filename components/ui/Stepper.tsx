"use client";

import { cn } from "@/lib/utils";

interface StepperProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

export function Stepper({ currentStep, totalSteps = 5, labels }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isDone && "bg-success text-white",
                  isActive && "bg-primary text-white",
                  !isDone && !isActive && "bg-slate-100 text-text-muted border border-border"
                )}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>

              {step < totalSteps && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5",
                    isDone ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {labels && labels.length > 0 && (
        <div className="flex justify-between mt-2">
          {labels.map((label, i) => (
            <span
              key={i}
              className={cn(
                "text-[11px] text-center",
                i + 1 === currentStep ? "text-primary font-medium" : "text-text-muted"
              )}
              style={{ width: `${100 / totalSteps}%` }}
            >
              {label}
            </span>
          )}
        </div>
      )}

      <p className="text-center text-sm text-text-secondary mt-3">
        Étape {currentStep} sur {totalSteps}
      </p>
    </div>
  );
}
