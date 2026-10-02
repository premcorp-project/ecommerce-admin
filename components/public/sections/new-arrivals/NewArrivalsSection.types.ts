/**
 * NewArrivalsSection types
 *
 * All variants of NewArrivalsSection must satisfy this interface.
 * Pages remain variant-agnostic by importing from index.ts.
 */

export interface NewArrivalsSectionProps {
    /** Optional override for the section heading. Defaults to t('newArrivalsTitle'). */
    title?: string;
    /** Optional override for the section subtitle. Defaults to t('newArrivalsSubtitle'). */
    subtitle?: string;
}
