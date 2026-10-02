'use client';

/**
 * SearchOverlay — full-screen search with spring-based animations.
 *
 * Uses motion/react for physics-based entrance/exit:
 * - Backdrop fades in
 * - Panel scales up from 0.96 with spring physics (bounce)
 * - Suggestion items stagger in from below
 *
 * Features: recent searches (localStorage), popular suggestions,
 * keyboard shortcut (Cmd+K), ESC to close, auto-focus.
 */

import { cn } from '@/lib/utils';
import { Clock, Search, TrendingUp, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── LocalStorage for recent searches ─────────────────────────────────────────

const RECENT_KEY = 'chemibuild_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch { return []; }
}

function addRecentSearch(query: string): void {
    if (typeof window === 'undefined') return;
    const existing = getRecentSearches().filter((s) => s !== query);
    const updated = [query, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function clearRecentSearches(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECENT_KEY);
}

// ─── Popular suggestions ──────────────────────────────────────────────────────

const POPULAR_SUGGESTIONS = [
    'Industrial Degreaser',
    'Epoxy Resin',
    'Floor Cleaner',
    'Hand Sanitiser',
    'Protective Coating',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchOverlayProps {
    open: boolean;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
    const t = useTranslations('public.nav');
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load recent searches on open
    useEffect(() => {
        if (open) {
            setRecentSearches(getRecentSearches());
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const handleSearch = useCallback((searchQuery: string) => {
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        addRecentSearch(trimmed);
        router.push(`/products?search=${encodeURIComponent(trimmed)}`);
        onClose();
    }, [router, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    const handleClearRecent = () => {
        clearRecentSearches();
        setRecentSearches([]);
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[18vh]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                        className="relative w-full max-w-2xl mx-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('searchAriaLabel')}
                    >
                        <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden">
                            {/* Search input */}
                            <form onSubmit={handleSubmit} className="relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" aria-hidden="true" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t('searchPlaceholder')}
                                    aria-label={t('searchAriaLabel')}
                                    className={cn(
                                        'w-full bg-transparent pl-14 pr-14 py-5',
                                        'text-lg text-foreground placeholder:text-muted-foreground',
                                        'outline-none border-b border-border',
                                    )}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Close search"
                                >
                                    <span className="hidden sm:inline">ESC</span>
                                    <X className="size-3.5 sm:hidden" />
                                </button>
                            </form>

                            {/* Suggestions */}
                            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-5">
                                {/* Recent searches */}
                                {recentSearches.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                {t('searchRecent')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleClearRecent}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {t('searchClearRecent')}
                                            </button>
                                        </div>
                                        <ul className="space-y-0.5">
                                            {recentSearches.map((search) => (
                                                <li key={search}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSearch(search)}
                                                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left min-h-[44px]"
                                                    >
                                                        <Clock className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                                                        {search}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Popular suggestions */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('searchPopular')}
                                    </p>
                                    <ul className="space-y-0.5">
                                        {POPULAR_SUGGESTIONS.map((suggestion) => (
                                            <li key={suggestion}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearch(suggestion)}
                                                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left min-h-[44px]"
                                                >
                                                    <TrendingUp className="size-4 text-primary shrink-0" aria-hidden="true" />
                                                    {suggestion}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-border px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t('searchHint')}</span>
                                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default SearchOverlay;
