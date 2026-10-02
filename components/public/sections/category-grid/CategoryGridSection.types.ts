/**
 * CategoryGridSection.types.ts
 *
 * Shared props interface for all CategoryGridSection variants.
 * All variants must satisfy this contract so pages remain variant-agnostic.
 *
 * Requirements: 3.4
 */

export interface CategoryGridSectionProps {
    /**
     * Override the section heading. Falls back to the i18n key
     * `public.home.categoriesTitle` when not provided.
     */
    title?: string;

    /**
     * Override the section subtitle. Falls back to
     * `public.home.categoriesSubtitle` when not provided.
     */
    subtitle?: string;

    /** Additional Tailwind classes applied to the outermost wrapper. */
    className?: string;
}
