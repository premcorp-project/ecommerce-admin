/**
 * PromoBannersSection types
 *
 * All variants of PromoBannersSection must satisfy this interface.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

export interface PromoBannersSectionProps { }

/** Internal shape for each static promo banner entry */
export interface PromoBannerData {
    categorySlug: string;
    labelKey: string;
    headlineKey: string;
    offerKey: string;
    ctaKey: string;
    imageSrc: string;
    imageAlt: string;
}
