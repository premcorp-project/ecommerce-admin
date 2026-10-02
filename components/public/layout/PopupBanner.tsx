'use client';

/**
 * PopupBanner — high-engagement promotional modal.
 *
 * Design principles:
 * - Split layout: image left, content right (desktop) / stacked (mobile)
 * - Bold typography with clear value proposition
 * - Urgency indicator (countdown or limited badge)
 * - Single clear CTA with hover animation
 * - Smooth spring entrance from center
 * - Subtle confetti/sparkle decorative elements
 * - Respects frequency: once/session/always via storage
 *
 * Fetches GET /banners?placement=popup&active=true
 */

import { usePublicQuery } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PopupBannerData {
    _id: string;
    title: string;
    subtitle?: string;
    image?: { url: string; publicId: string };
    link: string;
    ctaText?: string;
    popupDelay: number;
    popupFrequency: 'once' | 'session' | 'always';
}

interface BannersResponse {
    data: { banners: PopupBannerData[] };
}

// ─── Frequency helpers ────────────────────────────────────────────────────────

const POPUP_STORAGE_KEY = 'chemibuild_popup_dismissed';

function shouldShowPopup(banner: PopupBannerData): boolean {
    if (typeof window === 'undefined') return false;
    if (banner.popupFrequency === 'always') return true;

    const storage = banner.popupFrequency === 'session' ? sessionStorage : localStorage;
    try {
        const dismissed: string[] = JSON.parse(storage.getItem(POPUP_STORAGE_KEY) || '[]');
        return !dismissed.includes(banner._id);
    } catch { return true; }
}

function markDismissed(banner: PopupBannerData): void {
    if (typeof window === 'undefined') return;
    const storage = banner.popupFrequency === 'session' ? sessionStorage : localStorage;
    try {
        const existing: string[] = JSON.parse(storage.getItem(POPUP_STORAGE_KEY) || '[]');
        if (!existing.includes(banner._id)) {
            storage.setItem(POPUP_STORAGE_KEY, JSON.stringify([...existing, banner._id]));
        }
    } catch { /* storage full */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PopupBanner() {
    const [visible, setVisible] = useState(false);
    const [activeBanner, setActiveBanner] = useState<PopupBannerData | null>(null);

    const { data } = usePublicQuery<BannersResponse>(
        ['public', 'popup-banners'],
        '/banners',
        { staleTime: 1000 * 60 * 30 },
        { params: { placement: 'popup', active: true } },
    );

    const banners: PopupBannerData[] = (data as any)?.data?.banners ?? [];

    useEffect(() => {
        if (banners.length === 0) return;
        const banner = banners.find((b) => shouldShowPopup(b));
        if (!banner) return;

        setActiveBanner(banner);
        const timer = setTimeout(() => setVisible(true), (banner.popupDelay ?? 5) * 1000);
        return () => clearTimeout(timer);
    }, [banners]);

    // Prevent body scroll
    useEffect(() => {
        if (visible) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [visible]);

    const handleClose = () => {
        setVisible(false);
        if (activeBanner) markDismissed(activeBanner);
    };

    if (!activeBanner) return null;

    const hasImage = !!activeBanner.image?.url;

    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.9 }}
                        className={cn(
                            'relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
                            hasImage ? 'max-w-2xl' : 'max-w-md',
                        )}
                        role="dialog"
                        aria-modal="true"
                        aria-label={activeBanner.title}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="absolute top-3 right-3 z-20 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-all duration-150"
                            aria-label="Close"
                        >
                            <X className="size-4" />
                        </button>

                        <div className={cn(
                            'flex flex-col',
                            hasImage && 'sm:flex-row',
                        )}>
                            {/* Image side */}
                            {hasImage && (
                                <div className="relative w-full sm:w-1/2 aspect-[4/3] sm:aspect-auto sm:min-h-[320px] shrink-0">
                                    <Image
                                        src={activeBanner.image!.url}
                                        alt={activeBanner.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                        className="object-cover"
                                    />
                                    {/* Gradient fade into content */}
                                    <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-card via-transparent to-transparent opacity-40" />
                                </div>
                            )}

                            {/* Content side */}
                            <div className={cn(
                                'flex flex-col justify-center p-6 sm:p-8',
                                hasImage ? 'sm:w-1/2' : 'text-center',
                            )}>
                                {/* Sparkle badge */}
                                <div className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-4 self-start',
                                    !hasImage && 'self-center',
                                )}>
                                    <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                                    <span className="text-xs font-semibold text-primary">
                                        Limited Offer
                                    </span>
                                </div>

                                {/* Title */}
                                <h2 className="text-xl font-bold text-foreground sm:text-2xl lg:text-[1.75rem] leading-tight tracking-tight">
                                    {activeBanner.title}
                                </h2>

                                {/* Subtitle */}
                                {activeBanner.subtitle && (
                                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                        {activeBanner.subtitle}
                                    </p>
                                )}

                                {/* CTA */}
                                {activeBanner.link && (
                                    <Link
                                        href={activeBanner.link}
                                        onClick={() => { markDismissed(activeBanner); setVisible(false); }}
                                        className={cn(
                                            'inline-flex items-center gap-2 mt-6 self-start',
                                            'rounded-lg bg-primary text-primary-foreground',
                                            'px-6 py-3 text-sm font-bold',
                                            'transition-all duration-200',
                                            'hover:brightness-110 hover:gap-3',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            'min-h-[48px] shadow-md shadow-primary/20',
                                            !hasImage && 'self-center',
                                        )}
                                    >
                                        {activeBanner.ctaText || 'Shop Now'}
                                        <ArrowRight className="size-4 transition-transform duration-200" aria-hidden="true" />
                                    </Link>
                                )}

                                {/* Dismiss text */}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className={cn(
                                        'mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors self-start',
                                        !hasImage && 'self-center',
                                    )}
                                >
                                    No thanks, I&apos;ll browse on my own
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default PopupBanner;
