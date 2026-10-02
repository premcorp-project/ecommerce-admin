/**
 * PromoBannerSection.types.ts
 *
 * Shared props interface for all PromoBannerSection variants.
 * All variants must satisfy this contract so pages remain variant-agnostic.
 *
 * Requirements: 3.6
 */

export interface PromoBannerSectionProps {
    /**
     * Override the banner title. Falls back to the i18n key
     * `public.home.promoTitle` when not provided.
     */
    title?: string;

    /**
     * Override the banner subtitle / body copy. Falls back to
     * `public.home.promoSubtitle` when not provided.
     */
    subtitle?: string;

    /**
     * Label for the call-to-action button. Falls back to
     * `public.home.promoCta` when not provided.
     */
    ctaLabel?: string;

    /**
     * Destination URL for the CTA button.
     * Defaults to `/products` when not provided.
     */
    ctaHref?: string;

    /** Additional Tailwind classes applied to the outermost wrapper. */
    className?: string;
}
