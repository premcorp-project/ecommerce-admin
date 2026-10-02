'use client';

/**
 * ReviewSection — product reviews list + submit form.
 *
 * - Fetches paginated reviews from GET /catalog/products/:productId/reviews
 * - Renders each review with Rating, reviewer name, and date
 * - Shows review form for authenticated customers with delivered orders
 * - Hides form on 403 (no delivered order) or 409 (already reviewed)
 * - Shows skeleton while loading; handles errors gracefully
 *
 * Requirements: 5.9, 5.10
 */

import { Rating } from '@/components/public/common/Rating';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { Pagination, Review } from '@/types/public';
import { AlertCircle, MessageSquare, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ReviewForm } from './ReviewForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewsApiResponse {
    data: {
        reviews: Review[];
        pagination: Pagination;
    };
}

interface ReviewSectionProps {
    productId: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReviewSkeleton() {
    return (
        <div className="animate-pulse space-y-3 py-4 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted ml-auto" />
            </div>
            <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="size-4 rounded bg-muted" />
                ))}
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
        </div>
    );
}

// ─── Review Item ──────────────────────────────────────────────────────────────

function ReviewItem({ review }: { review: Review }) {
    const t = useTranslations('public.product');

    const formattedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(review.createdAt));

    return (
        <article className="py-4 border-b border-border last:border-0">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Avatar placeholder */}
                    <div
                        className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
                        aria-hidden="true"
                    >
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            {review.user.name.charAt(0)}
                        </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                        {review.user.name}
                    </span>
                </div>
                <time
                    dateTime={review.createdAt}
                    className="text-xs text-muted-foreground shrink-0"
                >
                    {formattedDate}
                </time>
            </div>

            <Rating
                value={review.rating}
                size="sm"
                className="mb-2"
                ariaLabel={`${review.rating} out of 5 stars`}
            />

            {review.comment && (
                <p className="text-sm text-foreground/80 leading-relaxed">
                    {review.comment}
                </p>
            )}
        </article>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReviewSection({ productId }: ReviewSectionProps) {
    const t = useTranslations('public.product');
    const tc = useTranslations('public.common');
    const { user } = useCustomerAuthStore();
    const hydrated = useHydrated();

    const [page, setPage] = useState(1);
    const [formHidden, setFormHidden] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [formMessage, setFormMessage] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = usePublicQuery<ReviewsApiResponse>(
        [...publicQueryKeys.reviews(productId), page],
        `/catalog/products/${productId}/reviews`,
        {},
        { params: { page, limit: 10 } },
    );

    const reviews: Review[] = data?.data?.reviews ?? [];
    const pagination: Pagination | undefined = data?.data?.pagination;

    const handleReviewSuccess = () => {
        setReviewSubmitted(true);
        setFormHidden(true);
        // Invalidate reviews cache by refetching page 1
        setPage(1);
        refetch();
    };

    const handleFormHide = () => {
        setFormMessage(t('reviewPurchaseRequired'));
    };

    // Show review form for authenticated users who haven't submitted yet
    const showForm = hydrated && !!user && !formHidden && !reviewSubmitted;

    return (
        <section aria-labelledby="reviews-heading" className="py-8">
            <h2
                id="reviews-heading"
                className="text-xl font-bold text-foreground mb-6"
            >
                {t('reviews')}
                {pagination && pagination.totalCount > 0 && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                        ({pagination.totalCount})
                    </span>
                )}
            </h2>

            {/* Review form for authenticated users */}
            {showForm && (
                <div className="mb-8 rounded-lg border border-border bg-card p-5">
                    <h3 className="text-base font-semibold text-foreground mb-4">
                        {t('writeReview')}
                    </h3>
                    {/* Message when 403 — not purchased */}
                    {formMessage && (
                        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-900/10 px-4 py-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                {formMessage}
                            </p>
                        </div>
                    )}
                    <ReviewForm
                        productId={productId}
                        onSuccess={handleReviewSuccess}
                        onHide={handleFormHide}
                    />
                </div>
            )}

            {/* Not logged in hint */}
            {hydrated && !user && (
                <div className="mb-6 rounded-lg border border-border bg-muted/50 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                        {t('reviewLoginRequired')}
                    </p>
                </div>
            )}

            {/* Success message after submission */}
            {reviewSubmitted && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 px-4 py-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        {t('reviewSubmitted')}
                    </p>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="space-y-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <ReviewSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Error state */}
            {isError && !isLoading && (
                <div
                    role="alert"
                    className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
                >
                    <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
                    <div>
                        <p className="font-semibold text-foreground">{tc('errorTitle')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{tc('errorHint')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        {tc('errorRetry')}
                    </button>
                </div>
            )}

            {/* Reviews list */}
            {!isLoading && !isError && (
                <>
                    {reviews.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <MessageSquare
                                className="size-10 text-muted-foreground/50"
                                aria-hidden="true"
                            />
                            <p className="text-sm text-muted-foreground">{t('noReviews')}</p>
                        </div>
                    ) : (
                        <div className="divide-y-0">
                            {reviews.map((review) => (
                                <ReviewItem key={review._id} review={review} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                {tc('showing', {
                                    start: (pagination.currentPage - 1) * pagination.perPage + 1,
                                    end: Math.min(
                                        pagination.currentPage * pagination.perPage,
                                        pagination.totalCount,
                                    ),
                                    total: pagination.totalCount,
                                })}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={!pagination.hasPrevPage}
                                    aria-label={tc('previous')}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {tc('previous')}
                                </button>
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    {pagination.currentPage} / {pagination.totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!pagination.hasNextPage}
                                    aria-label={tc('next')}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {tc('next')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default ReviewSection;
