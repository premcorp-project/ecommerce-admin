'use client';

/**
 * ReviewForm — star rating + comment form for submitting a product review.
 *
 * - Uses Formik + Yup for form state and validation
 * - Calls POST /catalog/products/:productId/reviews via usePublicMutation
 * - 403 → hides the form (no delivered order containing this product)
 * - 409 → hides the form (already reviewed)
 * - Other errors → shown inline
 *
 * Requirements: 5.10
 */

import { usePublicMutation } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { Review } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewFormProps {
    productId: string;
    onSuccess: () => void;
    /** Called when the form should be hidden (403 or 409) */
    onHide: () => void;
}

interface ReviewPayload {
    rating: number;
    comment: string;
}

interface ReviewApiResponse {
    data: Review;
}

// ─── Validation schema ────────────────────────────────────────────────────────

const reviewSchema = Yup.object({
    rating: Yup.number()
        .min(1, 'Please select a rating')
        .max(5)
        .required('Please select a rating'),
    comment: Yup.string().max(2000, 'Comment must be 2000 characters or less'),
});

// ─── Star Picker ──────────────────────────────────────────────────────────────

interface StarPickerProps {
    value: number;
    onChange: (value: number) => void;
    error?: string;
}

function StarPicker({ value, onChange, error }: StarPickerProps) {
    const t = useTranslations('public.product');
    const [hovered, setHovered] = useState(0);

    return (
        <div>
            <div
                className="flex gap-1"
                role="radiogroup"
                aria-label={t('reviewRating')}
            >
                {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (hovered || value);
                    return (
                        <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={value === star}
                            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                            onClick={() => onChange(star)}
                            onMouseEnter={() => setHovered(star)}
                            onMouseLeave={() => setHovered(0)}
                            className="p-0.5 rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Star
                                className={`size-7 transition-colors ${
                                    isActive
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-muted text-muted-foreground'
                                }`}
                                aria-hidden="true"
                            />
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewForm({ productId, onSuccess, onHide }: ReviewFormProps) {
    const t = useTranslations('public.product');
    const queryClient = useQueryClient();
    const [serverError, setServerError] = useState<string | null>(null);

    const mutation = usePublicMutation<ReviewApiResponse, ReviewPayload>(
        'post',
        `/catalog/products/${productId}/reviews`,
        {
            onSuccess: () => {
                // Invalidate reviews cache so the new review appears
                queryClient.invalidateQueries({
                    queryKey: publicQueryKeys.reviews(productId),
                });
                toast.success(t('reviewSubmitted'));
                onSuccess();
            },
            onError: (error) => {
                const status = (error as any)?.response?.status;
                const message = (error as any)?.response?.data?.message;

                if (status === 403) {
                    // No delivered order — hide the form silently
                    onHide();
                    return;
                }
                if (status === 409) {
                    // Already reviewed — hide the form
                    onHide();
                    return;
                }
                setServerError(message ?? t('reviewSubmitting'));
            },
        },
    );

    const formik = useFormik<ReviewPayload>({
        initialValues: { rating: 0, comment: '' },
        validationSchema: reviewSchema,
        onSubmit: async (values) => {
            setServerError(null);
            try {
                await mutation.mutateAsync(values);
            } catch {
                // onError handles display — swallow the rejection
            }
        },
    });

    return (
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
            {/* Star rating picker */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    {t('reviewRating')}
                    <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                </label>
                <StarPicker
                    value={formik.values.rating}
                    onChange={(val) => formik.setFieldValue('rating', val)}
                    error={
                        formik.touched.rating && formik.errors.rating
                            ? formik.errors.rating
                            : undefined
                    }
                />
            </div>

            {/* Comment textarea */}
            <div>
                <label
                    htmlFor="review-comment"
                    className="block text-sm font-medium text-foreground mb-1.5"
                >
                    {t('reviewComment')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({t('reviewCommentPlaceholder').slice(0, 8)}…)
                    </span>
                </label>
                <textarea
                    id="review-comment"
                    name="comment"
                    rows={4}
                    value={formik.values.comment}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder={t('reviewCommentPlaceholder')}
                    maxLength={2000}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-colors"
                    aria-describedby={
                        formik.touched.comment && formik.errors.comment
                            ? 'comment-error'
                            : undefined
                    }
                />
                {formik.touched.comment && formik.errors.comment && (
                    <p id="comment-error" className="mt-1 text-xs text-destructive" role="alert">
                        {formik.errors.comment}
                    </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground text-right">
                    {formik.values.comment.length} / 2000
                </p>
            </div>

            {/* Server error */}
            {serverError && (
                <p className="text-sm text-destructive" role="alert">
                    {serverError}
                </p>
            )}

            {/* Submit button */}
            <button
                type="submit"
                disabled={mutation.isPending || formik.values.rating === 0}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
            >
                {mutation.isPending ? t('reviewSubmitting') : t('reviewSubmit')}
            </button>
        </form>
    );
}

export default ReviewForm;
