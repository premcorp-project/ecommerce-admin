/**
 * ProductFiltersSection types
 *
 * All variants of ProductFiltersSection must satisfy this interface.
 * Requirements: 4.3, 4.4, 4.5, 4.11, 4.12
 */

import type { AvailableFilters } from '@/types/public';

export interface ProductFiltersSectionProps {
    /** Available filters returned by GET /catalog/products */
    availableFilters: AvailableFilters;
}
