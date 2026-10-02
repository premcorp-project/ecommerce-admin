'use client';

/**
 * Breadcrumb — renders a breadcrumb trail from the current path.
 *
 * Uses localised segment labels from public.nav.*.
 * Truncates on mobile via `truncate` + `min-w-0`.
 * Requirements: 2.8
 */

import { ChevronRight, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreadcrumbProps {
    /** Optional override for the last segment label (e.g. product name) */
    currentLabel?: string;
    /** Additional CSS classes */
    className?: string;
}

// ─── Segment → i18n key map ───────────────────────────────────────────────────
// Maps URL path segments to keys in the public.nav namespace.
// Dynamic segments (slugs, IDs) are not in this map and fall back to prettified text.

const SEGMENT_LABEL_KEYS: Record<string, string> = {
    products: 'products',
    categories: 'categories',
    cart: 'cart',
    checkout: 'checkout',
    orders: 'orders',
    account: 'account',
    login: 'login',
    register: 'register',
    wishlist: 'wishlist',
    'order-lookup': 'orderLookup',
    confirmation: 'confirmation',
    profile: 'profile',
    addresses: 'addresses',
    support: 'support',
    'forgot-password': 'forgotPassword',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Prettify a raw URL segment into a readable label (fallback for dynamic segments). */
function prettifySegment(segment: string): string {
    const decoded = decodeURIComponent(segment);
    // Truncate very long dynamic segments (e.g. order IDs, slugs)
    const truncated = decoded.length > 28 ? decoded.slice(0, 28) + '…' : decoded;
    return truncated.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Breadcrumb({ currentLabel, className }: BreadcrumbProps) {
    const t = useTranslations('public.nav');
    const pathname = usePathname();

    // Build segments from pathname, filtering empty strings
    const rawSegments = pathname.split('/').filter(Boolean);

    // Don't render on the homepage
    if (rawSegments.length === 0) return null;

    // Build crumb objects: one per path segment
    const crumbs = rawSegments.map((segment, index) => {
        const href = '/' + rawSegments.slice(0, index + 1).join('/');
        const isLast = index === rawSegments.length - 1;

        let label: string;
        if (isLast && currentLabel) {
            // Caller-supplied label takes priority on the last crumb
            label = currentLabel;
        } else {
            const key = SEGMENT_LABEL_KEYS[segment];
            if (key) {
                // Known segment — use localised label
                label = t(key as Parameters<typeof t>[0]);
            } else {
                // Dynamic segment (slug, ID) — prettify and truncate
                label = prettifySegment(segment);
            }
        }

        return { href, label, isLast };
    });

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center gap-1 text-sm text-muted-foreground overflow-hidden ${className ?? ''}`}
        >
            {/* Home icon link */}
            <Link
                href="/"
                className="flex items-center shrink-0 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-label={t('home')}
            >
                <Home className="size-3.5" aria-hidden="true" />
            </Link>

            {crumbs.map(({ href, label, isLast }) => (
                <span key={href} className="flex items-center gap-1 min-w-0">
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    {isLast ? (
                        <span
                            className="truncate text-foreground font-medium"
                            aria-current="page"
                            title={label}
                        >
                            {label}
                        </span>
                    ) : (
                        <Link
                            href={href}
                            className="truncate hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            title={label}
                        >
                            {label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}

export default Breadcrumb;
