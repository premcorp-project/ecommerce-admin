'use client';

/**
 * PromoBannerSection.tsx — Default variant
 *
 * A full-width promotional strip rendered between the category grid and
 * featured products sections on the homepage. Designed for a professional
 * B2B chemical products platform: clean, precise, trust-first.
 *
 * - Static content (no API call required per Requirement 3.6)
 * - All strings from i18n namespace `public.home.*`
 * - Semantic tokens only — no hardcoded colours
 * - Fully responsive (mobile-first)
 *
 * Requirements: 3.6
 */

import { cn } from '@/lib/utils';
import { ArrowRight, Beaker, Package, ShieldCheck, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { PromoBannerSectionProps } from './PromoBannerSection.types';

// ── Trust-signal items shown inside the banner strip ──────────────────────────
const TRUST_ITEMS = [
  { icon: Beaker, labelKey: 'promoTrustChemical' },
  { icon: Package, labelKey: 'promoTrustBulk' },
  { icon: ShieldCheck, labelKey: 'promoTrustCertified' },
  { icon: Truck, labelKey: 'promoTrustDelivery' },
] as const;

export function PromoBannerSection({
  title,
  subtitle,
  ctaLabel,
  ctaHref = '/products',
  className,
}: PromoBannerSectionProps) {
  const t = useTranslations('public.home');

  const resolvedTitle = title ?? t('promoTitle');
  const resolvedSubtitle = subtitle ?? t('promoSubtitle');
  const resolvedCtaLabel = ctaLabel ?? t('promoCta');

  return (
    <section
      aria-label={resolvedTitle}
      className={cn('w-full', className)}
    >
      {/* ── Main promotional strip ─────────────────────────────────────────── */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            {/* Copy */}
            <div className="flex flex-col gap-2 lg:max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {resolvedTitle}
              </h2>
              <p className="text-sm leading-relaxed opacity-90 sm:text-base">
                {resolvedSubtitle}
              </p>
            </div>

            {/* CTA */}
            <Link
              href={ctaHref}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-md border border-primary-foreground/30',
                'bg-primary-foreground/10 px-6 py-3 text-sm font-semibold',
                'transition-colors duration-200',
                'hover:bg-primary-foreground/20 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary-foreground/50',
                'min-h-[44px] min-w-[44px]',
              )}
            >
              {resolvedCtaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust-signal bar ───────────────────────────────────────────────── */}
      <div className="border-b border-border bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <ul
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12"
            aria-label={t('promoTrustLabel')}
          >
            {TRUST_ITEMS.map(({ icon: Icon, labelKey }) => (
              <li
                key={labelKey}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Icon
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{t(labelKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default PromoBannerSection;
