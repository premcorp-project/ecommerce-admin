/**
 * TabbedProductsSection types
 *
 * All variants of TabbedProductsSection must satisfy this interface.
 * Requirements: 8.1–8.9
 */

import type { Product } from '@/types/public';

/** No props — section fetches its own data */
export interface TabbedProductsSectionProps { }

export interface TabbedProductRowProps {
    product: Product;
}

export interface TabbedPromoCardProps { }
