'use client';

/**
 * NewsletterStripSection — modern newsletter + contact info strip.
 *
 * Design: Full-width dark section with gradient accent, split into
 * left (newsletter CTA + form) and right (contact info grid).
 * Uses dynamic config data for phone/address.
 * Newsletter subscribes via POST /config/newsletter/subscribe.
 *
 * Requirements: 10.1–10.7, 12.2, 13.1, 13.3, 13.4
 */

import { useConfig } from '@/hooks/use-config';
import publicApi from '@/lib/api/public-api';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle, Clock, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { NewsletterStripSectionProps } from './NewsletterStripSection.types';

// ─── Email validation ─────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
    const atIndex = value.indexOf('@');
    if (atIndex < 1) return false;
    const domain = value.slice(atIndex + 1);
    return domain.includes('.') && domain.length > 2;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewsletterStripSection(_props: NewsletterStripSectionProps) {
    const t = useTranslations('public.home');
    const { businessPhone, businessEmail, businessAddress, businessCity, businessPostcode, businessHours } = useConfig();

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const displayAddress = [businessAddress, businessCity, businessPostcode]
        .filter(Boolean).join(', ') || t('newsletter.locationAddress');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!isValidEmail(email)) {
            setError(t('newsletter.invalidEmail'));
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await publicApi.post('/config/newsletter/subscribe', {
                email,
                ...(name.trim() && { name: name.trim() }),
            });
            setIsSuccess(true);
            setEmail('');
            setName('');
        } catch (err: unknown) {
            const message = (err as any)?.response?.data?.message;
            setError(message || t('newsletter.subscribeFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section aria-label="Newsletter and contact" className="relative overflow-hidden border-y border-border py-12 md:py-16 lg:py-20">
            {/* Gradient accent */}
            <div className="absolute inset-0" aria-hidden="true">
                <div className="absolute -top-1/2 -left-1/4 size-[500px] rounded-full bg-primary/15 blur-[100px]" />
                <div className="absolute -bottom-1/2 -right-1/4 size-[400px] rounded-full bg-primary/10 blur-[80px]" />
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

                    {/* Left — Newsletter */}
                    <div className="flex flex-col justify-center">
                        <h2 className="text-2xl font-bold text-foreground sm:text-3xl tracking-tight mb-3">
                            {t('newsletter.subscribeTitle')}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md">
                            {t('newsletter.subscribeSubtitle')}
                        </p>

                        {isSuccess ? (
                            <div className="flex items-center gap-3 rounded-xl bg-background border border-border px-5 py-4">
                                <CheckCircle className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                                <p className="text-sm font-medium text-foreground">{t('newsletter.success')}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('newsletter.namePlaceholder')}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'flex-1 min-w-0 rounded-lg bg-background border border-border px-4 py-3',
                                            'text-sm text-foreground placeholder:text-muted-foreground',
                                            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                                            'disabled:opacity-50 transition-all',
                                        )}
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                        placeholder={t('newsletter.emailPlaceholder')}
                                        aria-label={t('newsletter.emailAriaLabel')}
                                        required
                                        disabled={isSubmitting}
                                        className={cn(
                                            'flex-1 min-w-0 rounded-lg bg-background border border-border px-4 py-3',
                                            'text-sm text-foreground placeholder:text-muted-foreground',
                                            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                                            'disabled:opacity-50 transition-all',
                                            error && 'border-destructive/50',
                                        )}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={cn(
                                            'inline-flex items-center justify-center gap-2 shrink-0',
                                            'rounded-lg bg-primary px-6 py-3',
                                            'text-sm font-semibold text-primary-foreground',
                                            'hover:brightness-110 transition-all',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                            'disabled:opacity-50 min-h-[44px]',
                                        )}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                {t('newsletter.subscribe')}
                                                <ArrowRight className="size-4" aria-hidden="true" />
                                            </>
                                        )}
                                    </button>
                                </div>
                                {error && (
                                    <p role="alert" className="text-xs text-destructive">{error}</p>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Right — Contact info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Phone */}
                        {(businessPhone || true) && (
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                                    <Phone className="size-4 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        {t('newsletter.phoneTitle')}
                                    </p>
                                    <a
                                        href={`tel:${businessPhone}`}
                                        className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                                    >
                                        {businessPhone || t('newsletter.phoneNumber')}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        {(businessEmail || true) && (
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                                    <Mail className="size-4 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        {t('newsletter.emailTitle')}
                                    </p>
                                    <a
                                        href={`mailto:${businessEmail}`}
                                        className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                                    >
                                        {businessEmail || 'hello@chemibuild.com'}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                                <MapPin className="size-4 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    {t('newsletter.locationTitle')}
                                </p>
                                <p className="text-sm text-muted-foreground">{displayAddress}</p>
                            </div>
                        </div>

                        {/* Hours */}
                        {businessHours && (
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                                    <Clock className="size-4 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        {t('newsletter.hoursTitle')}
                                    </p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{businessHours}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default NewsletterStripSection;
