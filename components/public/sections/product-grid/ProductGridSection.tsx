'use client';

/**
 * ProductGridSection — default variant
 *
 * Renders a responsive ProductGrid with pagination controls.
 *
 * - Shows ProductSkeleton placeholders while loading (via ProductGrid's isLoading prop)
 * - Shows EmptyState ONLY when the products array is empty AND not loading
 * - NEVER shows EmptyState when products are present
 * - Pagination controls update the `page` URL search param via useRouter
 *
 * Props are passed from the page (SSR) — this section does NOT fetch its own data.
 *
 * Requirements: 4.6, 4.8, 4.9, 4.10
 */

import { ProductGrid } from '@/components/public/common/ProductGrid';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ProductGridSectionProps } from './ProductGridSection.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates the page numbers to display in the pagination bar.
 * Always shows first, last, current, and up to 1 neighbour on each side.
 * Inserts 'ellipsis' markers where pages are skipped.
 */
function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (current > 3) pages.push('ellipsis');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let p = start; p <= end; p++) {
        pages.push(p);
    }

    if (current < total - 2) pages.push('ellipsis');

    pages.push(total);

    return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductGridSection({
    products,
    pagination,
    isLoading,
    skeletonCount = 8,
}: ProductGridSectionProps) {
    const t = useTranslations('public.products');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentPage = pagination?.currentPage ?? 1;
    const totalPages = pagination?.totalPages ?? 1;
    const showPagination = !isLoading && totalPages > 1;

    // ── Navigation ────────────────────────────────────────────────────────────

    const navigateToPage = useCallback(
        (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', String(page));
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <section aria-label={t('title')} className="flex flex-col gap-8">
            {/* Product grid — delegates loading/empty/populated states to ProductGrid */}
            <ProductGrid
                products={products}
                isLoading={isLoading}
                skeletonCount={skeletonCount}
            />

            {/* Pagination controls — only rendered when there are multiple pages */}
            {showPagination && (
                <>
                    <nav
                        aria-label={t('page', { page: currentPage, total: totalPages })}
                        className="flex flex-col items-center gap-3"
                    >
                        <Pagination>
                            <PaginationContent>
                                {/* Previous page */}
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        aria-label={t('previousPage')}
                                        aria-disabled={currentPage <= 1}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) navigateToPage(currentPage - 1);
                                        }}
                                        className={
                                            currentPage <= 1
                                                ? 'pointer-events-none opacity-50'
                                                : undefined
                                        }
                                    />
                                </PaginationItem>

                                {/* Page numbers */}
                                {buildPageRange(currentPage, totalPages).map((item, idx) =>
                                    item === 'ellipsis' ? (
                                        <PaginationItem key={`ellipsis-${idx}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={item}>
                                            <PaginationLink
                                                href="#"
                                                isActive={item === currentPage}
                                                aria-current={
                                                    item === currentPage ? 'page' : undefined
                                                }
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (item !== currentPage) navigateToPage(item);
                                                }}
                                            >
                                                {item}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ),
                                )}

                                {/* Next page */}
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        aria-label={t('nextPage')}
                                        aria-disabled={currentPage >= totalPages}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages)
                                                navigateToPage(currentPage + 1);
                                        }}
                                        className={
                                            currentPage >= totalPages
                                                ? 'pointer-events-none opacity-50'
                                                : undefined
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>

                        {/* Page indicator */}
                        <p
                            className="text-sm text-muted-foreground"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {t('page', { page: currentPage, total: totalPages })}
                        </p>
                    </nav>
                </>
            )}
        </section>
    );
}

export default ProductGridSection;
