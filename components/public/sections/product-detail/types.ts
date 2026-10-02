/**
 * ProductDetailSection — shared interfaces
 *
 * All variants of the product-detail section must satisfy ProductDetailSectionProps.
 * Sub-component props are also defined here so they can be shared across files.
 */

import type { Product, Variant } from '@/types/public';

// ─── Section-level props ──────────────────────────────────────────────────────

export interface ProductDetailSectionProps {
    /** Full product object from GET /catalog/products/:slug (includes variants[]) */
    product: Product;
}

// ─── Sub-component props ──────────────────────────────────────────────────────

export interface ProductInfoProps {
    product: Product;
    /** The currently resolved variant (null when not all attributes are selected) */
    selectedVariant: Variant | null;
}

export interface VariantSelectorProps {
    product: Product;
    /** Called whenever the resolved variant changes (null = incomplete selection) */
    onVariantChange: (variant: Variant | null) => void;
    /** Optional controlled value — used to pre-populate selections */
    selectedVariant?: Variant | null;
}
