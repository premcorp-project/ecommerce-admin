'use client';

/**
 * NavbarSearch — debounced search input that navigates to /products?search={query}.
 *
 * Requirements: 2.5
 */

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavbarSearchProps {
    /** Additional CSS classes for the wrapper */
    className?: string;
    /** Called when the search drawer/overlay should close (mobile) */
    onClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NavbarSearch({ className, onClose }: NavbarSearchProps) {
    const t = useTranslations('public.nav');
    const router = useRouter();
    const [query, setQuery] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setQuery(value);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (value.trim()) {
                debounceRef.current = setTimeout(() => {
                    router.push(`/products?search=${encodeURIComponent(value.trim())}`);
                    onClose?.();
                }, 300);
            }
        },
        [router, onClose],
    );

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (query.trim()) {
                router.push(`/products?search=${encodeURIComponent(query.trim())}`);
                onClose?.();
            }
        },
        [query, router, onClose],
    );

    const handleClear = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setQuery('');
    }, []);

    return (
        <form
            onSubmit={handleSubmit}
            role="search"
            className={className}
        >
            <div className="relative flex items-center">
                <Search
                    className="absolute left-3 size-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                />
                <Input
                    type="search"
                    value={query}
                    onChange={handleChange}
                    placeholder={t('searchPlaceholder')}
                    aria-label={t('searchAriaLabel')}
                    className="pl-9 pr-8 h-9 w-full bg-muted/50 border-border focus-visible:bg-background"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t('clearSearch')}
                    >
                        <X className="size-3.5" aria-hidden="true" />
                    </button>
                )}
            </div>
        </form>
    );
}

export default NavbarSearch;
