'use client';

/**
 * CheckoutStepIndicator — responsive step progress indicator.
 *
 * Mobile: compact <progress> bar + "Step N of 5: Label"
 * Desktop (md+): full horizontal step list with numbers, labels,
 *   and completed / active / upcoming visual states.
 *
 * All colours use semantic tokens only.
 * All strings via t('public.checkout.*').
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutStepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
  className,
}: CheckoutStepIndicatorProps) {
  const t = useTranslations('public.checkout');
  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);
  const currentLabel = stepLabels[currentStep - 1] ?? '';

  return (
    <div className={cn('w-full', className)}>
      {/* ── Mobile: progress bar + label ──────────────────────────────── */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {t('step', { current: currentStep, total: totalSteps })}
          </p>
          <p className="text-sm text-muted-foreground truncate max-w-[60%] text-right">
            {currentLabel}
          </p>
        </div>
        <progress
          value={progressPercent}
          max={100}
          aria-label={t('step', { current: currentStep, total: totalSteps })}
          className={cn(
            'h-2 w-full overflow-hidden rounded-full',
            // Reset native progress appearance
            '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
            '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary',
            '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary',
          )}
        />
      </div>

      {/* ── Desktop: full horizontal step list ────────────────────────── */}
      <nav
        aria-label={t('step', { current: currentStep, total: totalSteps })}
        className="hidden md:block"
      >
        <ol className="flex items-center">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;
            const isLast = stepNumber === totalSteps;

            return (
              <li
                key={stepNumber}
                className={cn(
                  'flex items-center',
                  !isLast && 'flex-1',
                )}
              >
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Circle */}
                  <div
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      'text-xs font-bold transition-colors',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                      isUpcoming && 'border-2 border-border bg-background text-muted-foreground',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      isActive && 'text-foreground',
                      isCompleted && 'text-primary',
                      isUpcoming && 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </div>

                {/* Connector line between steps */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      'mx-2 h-0.5 flex-1 transition-colors',
                      isCompleted ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

export default CheckoutStepIndicator;
