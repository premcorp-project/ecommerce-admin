'use client';

import { Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export default function NoDataFound({
  title,
  subtitle,
  className,
}: Props) {
  const t = useTranslations('noDataFound');
  const resolvedTitle = title ?? t('title');
  const resolvedSubtitle = subtitle ?? t('subtitle');

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'mx-auto w-full rounded-xl border border-primary bg-background/50 p-8 text-center',
        'shadow-sm backdrop-blur',
        className,
      )}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-primary text-primary">
        <Inbox className="h-6 w-6 opacity-70" />
      </div>
      <h3 className="text-base font-semibold">{resolvedTitle}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{resolvedSubtitle}</p>
    </div>
  );
}
