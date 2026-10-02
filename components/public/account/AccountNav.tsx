'use client';

/**
 * AccountNav — navigation for the customer account area.
 *
 * Mobile:  horizontal scrollable tab bar (overflow-x-auto, no scrollbar visible)
 * Desktop: vertical sidebar with icon + label links
 *
 * Links: dashboard, profile, addresses, wishlist, support
 * Requirements: 9.9, 14.8
 */

import {
    Heart,
    LayoutDashboard,
    MapPin,
    MessageCircle,
    User
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    {
        href: '/account',
        labelKey: 'dashboard' as const,
        icon: LayoutDashboard,
        exact: true,
    },
    {
        href: '/account/profile',
        labelKey: 'profile' as const,
        icon: User,
        exact: false,
    },
    {
        href: '/account/addresses',
        labelKey: 'addresses' as const,
        icon: MapPin,
        exact: false,
    },
    {
        href: '/account/wishlist',
        labelKey: 'wishlist' as const,
        icon: Heart,
        exact: false,
    },
    {
        href: '/account/support',
        labelKey: 'support' as const,
        icon: MessageCircle,
        exact: false,
    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function AccountNav() {
    const t = useTranslations('public.account');
    const pathname = usePathname();

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

    return (
        <nav aria-label={t('title')}>
            {/* ── Mobile: horizontal scrollable tab bar ─────────────────────── */}
            <div className="md:hidden border-b border-border bg-background">
                <div
                    className="flex overflow-x-auto scrollbar-none gap-1 px-4 py-2"
                    role="tablist"
                    aria-label={t('title')}
                >
                    {NAV_ITEMS.map(({ href, labelKey, icon: Icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link
                                key={href}
                                href={href}
                                role="tab"
                                aria-selected={active}
                                className={[
                                    'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
                                    'min-h-[44px] min-w-[44px] transition-colors whitespace-nowrap',
                                    active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                ].join(' ')}
                            >
                                <Icon className="size-4 shrink-0" aria-hidden="true" />
                                {t(labelKey)}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Desktop: vertical sidebar ─────────────────────────────────── */}
            <aside
                className="hidden md:flex flex-col w-56 shrink-0 gap-1"
                aria-label={t('title')}
            >
                {/* Sidebar heading */}
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('title')}
                </p>

                {NAV_ITEMS.map(({ href, labelKey, icon: Icon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={[
                                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
                                'min-h-[44px] transition-colors',
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            ].join(' ')}
                        >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            {t(labelKey)}
                        </Link>
                    );
                })}
            </aside>
        </nav>
    );
}

export default AccountNav;
