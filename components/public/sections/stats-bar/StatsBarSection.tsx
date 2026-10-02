'use client';

import { useTranslations } from 'next-intl';
import type { StatsBarSectionProps } from './StatsBarSection.types';

/**
 * Static stat entries — keys map to public.home.stats.{key}.value / .label
 */
const STATS = [
  { key: 'yearsInBusiness' },
  { key: 'happyCustomers' },
  { key: 'certifiedProducts' },
  { key: 'monthlyOrders' },
] as const;

/**
 * StatsBarSection
 *
 * Static 4-stat dark bar. No API call, no loading/error state.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.2, 13.1, 13.4
 */
export function StatsBarSection(_props: StatsBarSectionProps) {
  const t = useTranslations('public.home');

  return (
    <section
      aria-label="Business statistics"
      className="bg-primary text-primary-foreground"
    >
      <div className="container mx-auto grid grid-cols-2 gap-8 px-4 py-12 text-center sm:grid-cols-4">
        {STATS.map(({ key }) => (
          <div key={key}>
            <p className="text-4xl font-bold">
              {t(`stats.${key}.value` as Parameters<typeof t>[0])}
            </p>
            <p className="mt-1 text-sm font-normal opacity-90">
              {t(`stats.${key}.label` as Parameters<typeof t>[0])}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
