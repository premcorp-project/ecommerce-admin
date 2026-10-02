'use client';

/**
 * Navbar — 3-row navigation for the public storefront.
 *
 * Row 1: Top info bar — location (left), language/currency (right)
 * Row 2: Middle — Logo (left), Search bar (center), Phone (right)
 * Row 3: Bottom nav bar (primary bg) — All Categories dropdown + nav links + icons
 *
 * Requirements: 2.2, 2.3, 2.4, 14.2
 */

import { CartDrawer } from '@/components/public/cart/CartDrawer';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfig } from '@/hooks/use-config';
import publicApi from '@/lib/api/public-api';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCartDrawerStore } from '@/lib/stores/cart-drawer-store';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import type { Category } from '@/types/public';
import {
    ChevronDown,
    FlaskConical,
    Heart,
    LogOut,
    Package,
    Search,
    User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';

// Animated icons
import { HeartIcon } from '@/components/ui/animated-icons/heart-icon';
import { MapPinIcon } from '@/components/ui/animated-icons/map-pin-icon';
import { MenuIcon } from '@/components/ui/animated-icons/menu-icon';
import { MoonIcon } from '@/components/ui/animated-icons/moon-icon';
import { PhoneIcon } from '@/components/ui/animated-icons/phone-icon';
import { SearchIcon } from '@/components/ui/animated-icons/search-icon';
import { ShoppingCartIcon } from '@/components/ui/animated-icons/shopping-cart-icon';
import { SunIcon } from '@/components/ui/animated-icons/sun-icon';
import { UserIcon } from '@/components/ui/animated-icons/user-icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartApiResponse {
    data?: { items?: unknown[]; itemCount?: number };
    items?: unknown[];
    itemCount?: number;
}

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { href: '/', labelKey: 'home' as const },
    { href: '/products', labelKey: 'shop' as const },
] as const;

// ─── Categories Dropdown ──────────────────────────────────────────────────────

function CategoriesDropdown() {
    const t = useTranslations('public.nav');
    const [open, setOpen] = useState(false);
    const [hoveredCat, setHoveredCat] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const menuIconRef = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);

    const { data: catData } = usePublicQuery<unknown>(
        ['public', 'categories', 'tree'],
        '/catalog/categories/tree',
        { staleTime: 1000 * 60 * 10 },
    );

    const rawCatData = (catData as any)?.data;
    const categories: Category[] = Array.isArray(rawCatData)
        ? rawCatData
        : Array.isArray((rawCatData as any)?.categories)
          ? (rawCatData as any).categories
          : [];

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setHoveredCat(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleMouseEnter = () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
        setOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimeout.current = setTimeout(() => {
            setOpen(false);
            setHoveredCat(null);
        }, 200);
    };

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                type="button"
                onClick={() => setOpen(!open)}
                onMouseEnter={() => menuIconRef.current?.startAnimation()}
                onMouseLeave={() => menuIconRef.current?.stopAnimation()}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm px-4 py-2 rounded-md transition-colors"
            >
                <MenuIcon ref={menuIconRef} size={16} className="text-primary" isAnimated={false} />
                <span>{t('allCategories')}</span>
                <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && categories.length > 0 && (
                <div className="absolute top-full left-0 mt-1 flex z-50">
                    {/* Main category list */}
                    <div className="w-56 rounded-l-lg border border-border bg-card shadow-lg py-2 max-h-[400px] overflow-y-auto">
                        {categories.map((cat) => {
                            const hasChildren = (cat.children?.length ?? 0) > 0;
                            const isHovered = hoveredCat === cat._id;
                            return (
                                <div
                                    key={cat._id}
                                    onMouseEnter={() => setHoveredCat(cat._id)}
                                >
                                    <Link
                                        href={`/products?category=${cat.slug}`}
                                        onClick={() => { setOpen(false); setHoveredCat(null); }}
                                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                                            isHovered ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                        {hasChildren && (
                                            <ChevronDown className="size-3 text-muted-foreground -rotate-90" aria-hidden="true" />
                                        )}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* Subcategory flyout — shows on hover */}
                    {hoveredCat && (() => {
                        const cat = categories.find((c) => c._id === hoveredCat);
                        if (!cat?.children?.length) return null;
                        return (
                            <div className="w-48 rounded-r-lg border border-l-0 border-border bg-card shadow-lg py-2 max-h-[400px] overflow-y-auto">
                                <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {cat.name}
                                </p>
                                {cat.children.map((child) => (
                                    <Link
                                        key={child._id}
                                        href={`/products?category=${child.slug}`}
                                        onClick={() => { setOpen(false); setHoveredCat(null); }}
                                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

// ─── Search Trigger (opens overlay) ───────────────────────────────────────────

function SearchTrigger({ onClick }: { onClick: () => void }) {
    const t = useTranslations('public.nav');

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-3 w-full max-w-lg border border-border rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:border-border transition-colors cursor-pointer"
            aria-label={t('searchAriaLabel')}
        >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{t('searchPlaceholder')}</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
            </kbd>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Navbar() {
    const t = useTranslations('public.nav');
    const tAuth = useTranslations('public.auth');
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { businessPhone, businessAddress, businessCity, currency } = useConfig();

    // Cmd+K / Ctrl+K keyboard shortcut to open search
    useSearchShortcut(useCallback(() => setSearchOpen(true), []));

    // Cart drawer — global store so other components can open it
    const { isOpen: cartOpen, open: openCart, close: closeCart } = useCartDrawerStore();

    const { user, clearAuth } = useCustomerAuthStore();
    const guestItemCount = useGuestCartStore((s) => s.itemCount);
    const hydrated = useHydrated();

    // Authenticated cart count
    const { data: cartData } = usePublicQuery<CartApiResponse>(
        publicQueryKeys.cart,
        '/orders/cart',
        { enabled: !!user, staleTime: 1000 * 30, retry: false },
    );

    const authCartCount =
        (cartData as any)?.data?.cart?.totalItems ??
        (cartData as any)?.data?.cart?.itemCount ??
        (cartData as any)?.data?.totalItems ??
        (cartData as any)?.data?.itemCount ?? 0;
    const cartCount = user ? authCartCount : guestItemCount;

    const handleLogout = useCallback(async () => {
        try { await publicApi.post('/auth/logout'); } catch { /* ignore */ }
        clearAuth();
        toast.success(tAuth('logoutSuccess'));
        router.push('/');
    }, [clearAuth, router, tAuth]);

    return (
        <>
            <div className="sticky top-0 z-40">
                {/* ── Row 1: Top info bar ─────────────────────────────────── */}
                <div className="bg-muted/60 border-b border-border">
                    <div className="container mx-auto flex items-center justify-between py-1.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPinIcon size={12} className="text-muted-foreground shrink-0" isAnimated={false} />
                            <span>{businessAddress ? `${businessAddress}${businessCity ? `, ${businessCity}` : ''}` : t('storeLocation')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>ENG | {currency}</span>
                        </div>
                    </div>
                </div>

                {/* ── Row 2: Logo + Search + Phone ────────────────────────── */}
                <header className="bg-background border-b border-border">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 gap-4">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 shrink-0 font-bold text-xl tracking-tight"
                            aria-label="OttimoDirect — Home"
                        >
                            <FlaskConical className="size-5 text-primary" aria-hidden="true" />
                            <span>
                                <span className="text-primary">Ottimo</span>
                                <span className="text-foreground">Direct</span>
                            </span>
                        </Link>

                        {/* Search trigger — hidden on mobile */}
                        <div className="hidden md:flex flex-1 justify-center">
                            <SearchTrigger onClick={() => setSearchOpen(true)} />
                        </div>

                        {/* Phone — hidden on mobile, only show if configured */}
                        {businessPhone && (
                            <a href={`tel:${businessPhone}`} className="hidden lg:flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                                <PhoneIcon size={16} className="text-primary" isAnimated={false} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground leading-tight">Customer Services</span>
                                    <span className="text-sm font-semibold text-foreground leading-tight">{businessPhone}</span>
                                </div>
                            </a>
                        )}

                        {/* Mobile: hamburger + search + cart */}
                        <div className="flex items-center gap-1 md:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label={t('searchAriaLabel')}>
                                <SearchIcon size={20} className="text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className={pathname.startsWith('/checkout') ? 'relative hidden' : 'relative'} onClick={() => openCart()} aria-label={t('cartAriaLabel')}>
                                <ShoppingCartIcon size={20} className="text-muted-foreground" />
                                {hydrated && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label={t('openMenu')}>
                                <MenuIcon size={20} />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* ── Row 3: Navigation bar (desktop only) ────────────────── */}
                <nav className="hidden md:block bg-card border-b border-border" aria-label="Main navigation">
                    <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 h-12">
                        {/* Left: Categories dropdown + nav links */}
                        <div className="flex items-center gap-6">
                            <CategoriesDropdown />
                            {NAV_LINKS.map(({ href, labelKey }) => {
                                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`text-sm font-medium transition-colors hover:text-primary ${
                                            isActive ? 'text-primary' : 'text-foreground'
                                        }`}
                                    >
                                        {t(labelKey)}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right: Icons */}
                        <div className="flex items-center gap-1">
                            {/* Wishlist */}
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/account/wishlist" aria-label={t('wishlistAriaLabel')}>
                                    <HeartIcon size={20} className="text-muted-foreground" />
                                </Link>
                            </Button>

                            {/* Theme toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Toggle theme"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            >
                                {hydrated && theme === 'dark' ? (
                                    <SunIcon size={20} className="text-muted-foreground" />
                                ) : hydrated ? (
                                    <MoonIcon size={20} className="text-muted-foreground" />
                                ) : (
                                    <span className="size-5" />
                                )}
                            </Button>

                            {/* Cart — hidden on checkout */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={pathname.startsWith('/checkout') ? 'relative hidden' : 'relative'}
                                aria-label={t('cartAriaLabel')}
                                onClick={() => openCart()}
                            >
                                <ShoppingCartIcon size={20} className="text-muted-foreground" />
                                {hydrated && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </Button>

                            {/* Account */}
                            {hydrated && user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="ml-1 gap-1.5">
                                            <UserIcon size={16} className="text-foreground" />
                                            <span className="hidden xl:inline text-sm">
                                                {user.name?.split(' ')[0]}
                                            </span>
                                            <ChevronDown className="size-3 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem asChild>
                                            <Link href="/account" className="flex items-center gap-2">
                                                <User className="size-4" />
                                                {t('myAccount')}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/orders" className="flex items-center gap-2">
                                                <Package className="size-4" />
                                                {t('myOrders')}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/account/wishlist" className="flex items-center gap-2">
                                                <Heart className="size-4" />
                                                {t('wishlist')}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                                        >
                                            <LogOut className="size-4" />
                                            {t('logout')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : hydrated ? (
                                <Button variant="ghost" size="icon" asChild className="ml-1">
                                    <Link href="/login" aria-label={t('loginAriaLabel')}>
                                        <UserIcon size={20} className="text-muted-foreground" />
                                    </Link>
                                </Button>
                            ) : (
                                <span className="size-9 ml-1" />
                            )}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Mobile menu drawer */}
            <MobileMenu
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onLogout={handleLogout}
            />

            {/* Cart drawer */}
            <CartDrawer
                open={cartOpen}
                onClose={() => closeCart()}
            />

            {/* Search overlay — shared between desktop and mobile */}
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}

// ─── Keyboard shortcut: Cmd+K / Ctrl+K opens search ──────────────────────────

function useSearchShortcut(onOpen: () => void) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onOpen();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onOpen]);
}

export default Navbar;
