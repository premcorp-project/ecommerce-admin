'use client';

import * as React from 'react';
import { AlertTriangle, CircleX, Info, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Variant = 'error' | 'warning' | 'info';

type Props = {
  title?: string;
  message?: string | null;
  variant?: Variant;
  onRetry?: () => void;
  className?: string;
};

const variantStyles: Record<
  Variant,
  {
    wrap: string;
    badge: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }
> = {
  error: {
    wrap: 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    icon: CircleX,
  },
  warning: {
    wrap: 'bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200',
    badge:
      'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    icon: AlertTriangle,
  },
  info: {
    wrap: 'bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200',
    badge: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200',
    icon: Info,
  },
};

export default function DisplayError({
  title,
  message,
  variant = 'error',
  onRetry,
  className,
}: Props) {
  const t = useTranslations('displayError');
  const resolvedTitle = title ?? t('somethingWentWrong');
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      className={cn(
        'mx-auto max-w-full rounded-xl p-5',
        'shadow-sm backdrop-blur',
        styles.wrap,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-xl p-2 shrink-0', styles.badge)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">{resolvedTitle}</h3>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
                  'border transition-colors',
                  'border-current/20 hover:bg-black/5 dark:hover:bg-white/5',
                )}
                aria-label={t('retry')}
              >
                <RefreshCw className="h-4 w-4" />
                {t('retry')}
              </button>
            )}
          </div>

          {message && (
            <p className="mt-1 text-sm/6 opacity-90 break-words">
              {t('messagePrefix')}{' '}
              {typeof message === 'string' ? message : String(message)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
