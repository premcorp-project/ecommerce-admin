'use client';

/**
 * NavbarAuthControls — auth section of the Navbar (desktop only).
 *
 * Shows customer name + dropdown when authenticated, login/register links when not.
 *
 * Uses a mounted guard to prevent hydration mismatch: the server always renders
 * the unauthenticated state (login/register links), and the client swaps to the
 * authenticated state after hydration if a user is present in sessionStorage.
 */

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomerUser } from '@/lib/stores/customer-auth-store';
import { LogOut, Package, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface NavbarAuthControlsProps {
    user: CustomerUser | null;
    onLogout: () => void;
}

export function NavbarAuthControls({ user, onLogout }: NavbarAuthControlsProps) {
    const t = useTranslations('public.nav');

    // Defer rendering auth-dependent UI until after hydration to prevent mismatch.
    // Server always renders the unauthenticated state.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Before mount: render the unauthenticated placeholder so server and client match
    if (!mounted) {
        return (
            <div className="hidden sm:flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild variant="default" size="sm">
                    <Link href="/register">{t('register')}</Link>
                </Button>
            </div>
        );
    }

    if (user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hidden sm:flex items-center gap-1.5 max-w-[160px]"
                    >
                        <User className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate text-sm">
                            {t('greeting', { name: user.name.split(' ')[0] })}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center gap-2">
                            <User className="size-4" aria-hidden="true" />
                            {t('myAccount')}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/orders" className="flex items-center gap-2">
                            <Package className="size-4" aria-hidden="true" />
                            {t('myOrders')}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={onLogout}
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        {t('logout')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="hidden sm:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t('login')}</Link>
            </Button>
            <Button asChild variant="default" size="sm">
                <Link href="/register">{t('register')}</Link>
            </Button>
        </div>
    );
}

export default NavbarAuthControls;
