/**
 * TagGridSection.types.ts
 *
 * Shared props interface for all TagGridSection variants.
 * All variants must satisfy this contract so pages remain variant-agnostic.
 */

export interface TagGridSectionProps {
    /**
     * Override the section heading. Falls back to the i18n key
     * `public.home.tagsTitle` when not provided.
     */
    title?: string;

    /** Additional Tailwind classes applied to the outermost wrapper. */
    className?: string;
}
