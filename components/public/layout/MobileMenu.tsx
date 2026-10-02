'use client';

/**
 * MobileMenu — slide-out drawer for mobile navigation.
 *
 * - Nav links (Home, Shop)
 * - Categories with expandable subcategories
 * - Auth section (login/register or account/logout)
 *
 * Requirements: 2.6, 14.2
 */

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { Category } from '@/types/public';
import { ChevronDown, LogOut, Package, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileMenuProps {
    open: boolean;
    onClose: () => void;
    onLogout: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileMenu({ open, onClose, onLogout }: MobileMenuProps) {
    const t = useTranslations('public.nav');
    const pathname = usePathname();
    const { user } = useCustomerAuthStore();
    const [expandedCat, setExpandedCat] = useState<string | null>(null);

    // Fetch category tree
    const { data: catData } = usePublicQuery<unknown>(
        ['public', 'categories', 'tree'],
        '/catalog/categories/tree',
        { staleTime: 1000 * 60 * 10, enabled: open },
    );

    const rawCatData = (catData as any)?.data;
    const categories: Category[] = Array.isArray(rawCatData)
        ? rawCatData
        : Array.isArray((rawCatData as any)?.categories)
          ? (rawCatData as any).categories
          : [];

    const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="left" className="flex flex-col w-80 p-0">
                <SheetTitle className="sr-only">{t('openMenu')}</SheetTitle>

                {/* Nav links + Categories */}
                <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
                    {/* Main links */}
                    <div className="py-2">
                        <Link
                            href="/"
                            onClick={onClose}
                            className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${
                                isActive('/') ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                            }`}
                        >
                            {t('home')}
                        </Link>
                        <Link
                            href="/products"
                            onClick={onClose}
                            className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${
                                isActive('/products') ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                            }`}
                        >
                            {t('shop')}
                        </Link>
                    </div>

                    <Separator />

                    {/* Categories with subcategories */}
                    {categories.length > 0 && (
                        <div className="py-2">
                            <p className="px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('allCategories')}
                            </p>
                            {categories.map((cat) => {
                                const hasChildren = (cat.children?.length ?? 0) > 0;
                                const isExpanded = expandedCat === cat._id;

                                return (
                                    <div key={cat._id}>
                                        <div className="flex items-center">
                                            <Link
                                                href={`/products?category=${cat.slug}`}
                                                onClick={onClose}
                                                className="flex-1 px-5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                {cat.name}
                                            </Link>
                                            {hasChildren && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedCat(isExpanded ? null : cat._id)}
                                                    className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                    aria-label={`Expand ${cat.name}`}
                                                >
                                                    <ChevronDown className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Subcategories */}
                                        {hasChildren && isExpanded && (
                                            <div className="bg-muted/30 border-l-2 border-primary/20 ml-5">
                                                {cat.children!.map((child) => (
                                                    <Link
                                                        key={child._id}
                                                        href={`/products?category=${child.slug}`}
                                                        onClick={onClose}
                                                        className="block px-5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </nav>

                <Separator />

                {/* Auth section */}
                <div className="p-4 flex flex-col gap-2">
                    {user ? (
                        <>
                            <div className="flex items-center gap-2 px-1 py-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                                    <User className="size-4 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {t('greeting', { name: user.name })}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href="/account"
                                onClick={onClose}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                                <User className="size-4" aria-hidden="true" />
                                {t('myAccount')}
                            </Link>
                            <Link
                                href="/orders"
                                onClick={onClose}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                                <Package className="size-4" aria-hidden="true" />
                                {t('myOrders')}
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { onLogout(); onClose(); }}
                                className="justify-start gap-2 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="size-4" aria-hidden="true" />
                                {t('logout')}
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Button asChild variant="default" size="sm" onClick={onClose}>
                                <Link href="/login">{t('login')}</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" onClick={onClose}>
                                <Link href="/register">{t('register')}</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default MobileMenu;
