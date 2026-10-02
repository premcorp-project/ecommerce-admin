'use client';

import { Check, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StepperIndicatorProps {
  currentStep: number;
  isEditMode: boolean;
  onStepClick: (step: number) => void;
}

export function StepperIndicator({ currentStep, isEditMode, onStepClick }: StepperIndicatorProps) {
  const t = useTranslations('admin.products');
  const steps = [t('form.steps.basicInfo'), t('form.steps.images'), t('form.steps.variants')] as const;

  return (
    <nav aria-label="Form steps" className="flex items-center justify-center gap-0 px-4 py-3">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;
        const isClickable = isEditMode;

        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNum)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${stepNum}: ${label}${isCompleted ? ' (completed)' : ''}`}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-primary/10 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground'
              } ${isClickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-primary-foreground text-primary'
                    : isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check size={10} /> : stepNum}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight size={14} className="mx-1 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
