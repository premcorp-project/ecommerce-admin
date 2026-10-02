/**
 * BestSellersSection types
 *
 * All variants of BestSellersSection must satisfy this interface.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

export interface BestSellersSectionProps {
    /** Optional override for the section heading. Defaults to t('bestSellersTitle'). */
    title?: string;
    /** Optional override for the section subtitle. Defaults to t('bestSellersSubtitle'). */
    subtitle?: string;
}
