'use client';

/**
 * Account Dashboard Content — app/(public)/account/AccountDashboardContent.tsx
 *
 * Shows:
 * - Welcome banner with user name, email, and member since date
 * - Quick stats grid (orders, addresses, wishlist, support tickets)
 * - Quick action links
 *
 * Requirements: 9.1, 9.2, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import {
    Heart,
    MapPin,
    MessageCircle,
    Package,
    ShoppingBag,
    User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function DashboardSkeleton() {
    return (
        <div className="animate-pulse space-y-6" aria-hidden="true">
            <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-4">
                <div className="size-14 rounded-full bg-muted" />
                <div className="space-y-2">
                    <div className="h-5 w-40 rounded bg-muted" />
                    <div className="h-4 w-56 rounded bg-muted" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <div className="h-8 w-8 rounded-lg bg-muted" />
                        <div className="h-7 w-12 rounded bg-muted" />
                        <div className="h-4 w-24 rounded bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Welcome banner ───────────────────────────────────────────────────────────

interface WelcomeBannerProps {
    name: string;
    email: string;
}

function WelcomeBanner({ name, email }: WelcomeBannerProps) {
    const t = useTranslations('public.account');

    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground truncate">
                        {t('welcomeBack', { name: name.split(' ')[0] })}
                    </h2>
                    <p className="text-sm text-muted-foreground truncate">{email}</p>
                </div>

                {/* Edit profile link */}
                <Link
                    href="/account/profile"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                    {t('editProfile')}
                </Link>
            </div>
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    href: string;
    ctaLabel: string;
}

function StatCard({ icon, label, value, href, ctaLabel }: StatCardProps) {
    return (
        <Link
            href={href}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <span className="text-xs font-medium text-primary">
                {ctaLabel} →
            </span>
        </Link>
    );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions() {
    const t = useTranslations('public.account');

    const actions = [
        { href: '/products', icon: <ShoppingBag className="size-4" />, label: t('continueShopping') },
        { href: '/orders', icon: <Package className="size-4" />, label: t('trackOrders') },
        { href: '/account/addresses', icon: <MapPin className="size-4" />, label: t('manageAddresses') },
        { href: '/account/support', icon: <MessageCircle className="size-4" />, label: t('getSupport') },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {actions.map(({ href, icon, label }) => (
                <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    {icon}
                    {label}
                </Link>
            ))}
        </div>
    );
}

// ─── Dashboard content ────────────────────────────────────────────────────────

function DashboardContent() {
    const t = useTranslations('public.account');

    const { data: ordersData } = usePublicQuery(
        [...publicQueryKeys.orders, 1],
        '/orders',
        { staleTime: 1000 * 60 * 2 },
        { params: { page: 1, limit: 5 } },
    );

    const { data: addressesData } = usePublicQuery(
        publicQueryKeys.addresses,
        '/users/addresses',
        { staleTime: 1000 * 60 * 5 },
    );

    const { data: wishlistData } = usePublicQuery(
        publicQueryKeys.wishlist,
        '/wishlist',
        { staleTime: 1000 * 60 * 5 },
    );

    const { data: ticketsData } = usePublicQuery(
        publicQueryKeys.tickets,
        '/support/tickets',
        { staleTime: 1000 * 60 * 2 },
    );

    const ordersCount: number =
        (ordersData as any)?.data?.pagination?.totalCount ?? 0;
    const addressesCount: number =
        ((addressesData as any)?.data?.addresses ?? (addressesData as any)?.data ?? []).length;
    const wishlistCount: number =
        ((wishlistData as any)?.data?.items ?? (wishlistData as any)?.items ?? []).length;
    const openTicketsCount: number =
        ((ticketsData as any)?.data?.tickets ?? []).filter(
            (tk: any) => tk.status === 'open' || tk.status === 'in_progress',
        ).length;

    return (
        <div className="space-y-8">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                    icon={<Package className="size-4" aria-hidden="true" />}
                    label={t('recentOrdersCount')}
                    value={ordersCount}
                    href="/orders"
                    ctaLabel={t('dashboardViewOrders')}
                />
                <StatCard
                    icon={<MapPin className="size-4" aria-hidden="true" />}
                    label={t('savedAddressesCount')}
                    value={addressesCount}
                    href="/account/addresses"
                    ctaLabel={t('dashboardViewAddresses')}
                />
                <StatCard
                    icon={<Heart className="size-4" aria-hidden="true" />}
                    label={t('wishlistCount')}
                    value={wishlistCount}
                    href="/account/wishlist"
                    ctaLabel={t('dashboardViewWishlist')}
                />
                <StatCard
                    icon={<MessageCircle className="size-4" aria-hidden="true" />}
                    label={t('openTicketsCount')}
                    value={openTicketsCount}
                    href="/account/support"
                    ctaLabel={t('dashboardViewSupport')}
                />
            </div>

            {/* Quick actions */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('quickActions')}</h3>
                <QuickActions />
            </div>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

export function AccountDashboardContent() {
    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();

    // Fetch fresh profile data from API (source of truth after updates)
    const { data: profileData } = usePublicQuery(
        publicQueryKeys.profile,
        '/users/profile',
        { staleTime: 1000 * 60 * 2, enabled: !!user },
    );

    // Unwrap profile from response envelope
    const profile = (profileData as any)?.data?.user ?? (profileData as any)?.data ?? null;
    const displayName = profile?.name ?? user?.name ?? '';
    const displayEmail = profile?.email ?? user?.email ?? '';

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace('/login?redirect=/account');
        }
    }, [user, router]);

    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <DashboardSkeleton />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* ── Page heading ──────────────────────────────────────────────── */}
            <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('title')}
            </h1>

            {/* ── Responsive layout ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 md:flex-row md:gap-10">
                <AccountNav />

                <main className="flex-1 min-w-0 space-y-6">
                    {/* Welcome banner with user info */}
                    <WelcomeBanner
                        name={displayName}
                        email={displayEmail}
                    />

                    {/* Dashboard stats + actions */}
                    <DashboardContent />
                </main>
            </div>
        </div>
    );
}
