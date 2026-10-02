/**
 * ProductGridSection types
 *
 * All variants of ProductGridSection must satisfy this interface.
 * Requirements: 4.6, 4.8, 4.9, 4.10
 */

import type { Pagination, Product } from '@/types/public';

export interface ProductGridSectionProps {
    /** Products to render in the grid */
    products: Product[];
    /** When true, renders skeleton placeholders instead of product cards */
    isLoading: boolean;
    /** Pagination metadata from the API response — drives pagination controls */
    pagination: Pagination | null;
    /** Number of skeleton cards to show while loading — defaults to 8 */
    skeletonCount?: number;
}
