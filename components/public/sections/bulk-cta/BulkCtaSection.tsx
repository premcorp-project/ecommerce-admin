'use client';

/**
 * BulkCtaSection — premium conversion banner for bulk/trade buyers.
 *
 * Modern asymmetric layout with gradient mesh background, floating badges,
 * and a bold CTA. Targets procurement teams and bulk buyers.
 * Hidden for users who already have bulk access.
 *
 * Design direction: Bold, block-based, high contrast with depth.
 * Uses semantic tokens only — works across all themes.
 */

import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { cn } from '@/lib/utils';
import { ArrowRight, BadgePercent, Package, Truck, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BulkCtaSectionProps } from './BulkCtaSection.types';

// ─── Floating benefit badge ───────────────────────────────────────────────────

interface BenefitBadgeProps {
    icon: React.ReactNode;
    label: string;
    className?: string;
}

function BenefitBadge({ icon, label, className }: BenefitBadgeProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2.5 rounded-full',
                'bg-background/95 backdrop-blur-sm border border-border/50',
                'px-4 py-2.5 shadow-lg shadow-black/5',
                'text-sm font-medium text-foreground',
                className,
            )}
        >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                {icon}
            </span>
            {label}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkCtaSection({ title }: BulkCtaSectionProps) {
    const t = useTranslations('public.home');
    const { user } = useCustomerAuthStore();

    // Hydration guard
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Hide for users who already have bulk access (only after hydration)
    if (mounted && user?.hasBulkAccess) return null;

    return (
        <section
            aria-labelledby="bulk-cta-heading"
            className="py-12 md:py-16 lg:py-20"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative isolate overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    {/* ── Gradient mesh background ─────────────────────────────── */}
                    <div className="absolute inset-0 -z-10" aria-hidden="true">
                        <div className="absolute -top-1/2 -right-1/4 size-[600px] rounded-full bg-primary/20 blur-[120px]" />
                        <div className="absolute -bottom-1/3 -left-1/4 size-[500px] rounded-full bg-primary/15 blur-[100px]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full bg-primary/10 blur-[80px]" />
                    </div>

                    {/* ── Grid pattern overlay ─────────────────────────────────── */}
                    <div
                        className="absolute inset-0 -z-10 opacity-[0.03]"
                        aria-hidden="true"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                            backgroundSize: '40px 40px',
                        }}
                    />

                    {/* ── Content ──────────────────────────────────────────────── */}
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">

                        {/* Left: Text + CTA */}
                        <div className="flex flex-col justify-center gap-6">
                            {/* Eyebrow */}
                            <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/20 px-3.5 py-1.5">
                                <Zap className="size-3.5 text-primary" aria-hidden="true" />
                                <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                                    {t('bulkCta.eyebrow')}
                                </span>
                            </div>

                            {/* Heading */}
                            <h2
                                id="bulk-cta-heading"
                                className="text-3xl font-bold text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15] tracking-tight"
                            >
                                {title ?? t('bulkCta.title')}
                            </h2>

                            {/* Subtitle */}
                            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
                                {t('bulkCta.subtitle')}
                            </p>

                            {/* CTA */}
                            <Link
                                href="/contact"
                                className={cn(
                                    'inline-flex items-center gap-2.5 self-start',
                                    'rounded-xl bg-primary text-primary-foreground',
                                    'px-7 py-3.5 text-sm font-bold',
                                    'transition-all duration-200',
                                    'hover:brightness-110 hover:gap-3.5',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                    'min-h-[48px] shadow-lg shadow-primary/25',
                                )}
                            >
                                {t('bulkCta.cta')}
                                <ArrowRight className="size-4 transition-transform duration-200" aria-hidden="true" />
                            </Link>
                        </div>

                        {/* Right: Floating benefit badges */}
                        <div className="relative flex items-center justify-center min-h-[240px] lg:min-h-0">
                            {/* Decorative ring */}
                            <div
                                className="absolute size-56 sm:size-64 rounded-full border border-border/30"
                                aria-hidden="true"
                            />
                            <div
                                className="absolute size-40 sm:size-48 rounded-full border border-border/20"
                                aria-hidden="true"
                            />

                            {/* Badges positioned around the ring */}
                            <BenefitBadge
                                icon={<BadgePercent className="size-4" />}
                                label={t('bulkCta.benefit1')}
                                className="absolute top-4 left-0 sm:top-2 sm:left-4 animate-in fade-in slide-in-from-left-4 duration-700"
                            />
                            <BenefitBadge
                                icon={<Package className="size-4" />}
                                label={t('bulkCta.benefit2')}
                                className="absolute top-1/2 -translate-y-1/2 right-0 sm:right-2 animate-in fade-in slide-in-from-right-4 duration-700 delay-150"
                            />
                            <BenefitBadge
                                icon={<Truck className="size-4" />}
                                label={t('bulkCta.benefit3')}
                                className="absolute bottom-4 left-4 sm:bottom-2 sm:left-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-300"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default BulkCtaSection;
