// ============================================================
// Shared types & constants for the Product multi-step form
// ============================================================

export const MAX_PRODUCT_IMAGES = 15;

export interface Product {
    _id: string;
    name: string;
    slug: string;
    description: string;
    /** Lowest variant price — use for "From £X.XX" display on listing pages */
    minPrice: number;
    category: { _id: string; name: string };
    images: { url: string; publicId: string }[];
    isFeatured: boolean;
    status: 'draft' | 'active' | 'sold';
    variantAttributes?: { key: string; values: string[] }[];
    createdAt: string;
    updatedAt: string;
}

/** A single tier entry for bulk or retail discount pricing */
export interface PricingTier {
    minQty: number;
    maxQty: number | null;
    type: 'percentage' | 'fixed';
    value: number;
}

/** A single tier entry for retail discount pricing (maxQty always required) */
export interface RetailDiscountTier {
    minQty: number;
    maxQty: number;
    type: 'percentage' | 'fixed';
    value: number;
}

export interface Variant {
    _id: string;
    sku: string;
    attributes: { key: string; value: string }[];
    /** Required — the variant's base price */
    price: number;
    /** Optional — sale price, must be < price */
    discountedPrice?: number | null;
    /** Pre-calculated effective price (discountedPrice if set, otherwise price) */
    effectivePrice: number;
    inventory: number;
    /** New tiered bulk pricing */
    bulkPricingTiers?: PricingTier[];
    /** Retail discount tiers for normal/guest users */
    retailDiscountTiers?: RetailDiscountTier[];
    /** Variant weight in kg (used for delivery fee calculation) */
    weight?: number | null;
    /** If true, this variant's weight is excluded from delivery fee for normal users */
    freeDelivery?: boolean;
    /** Max order quantity for normal & guest users (null = no limit) */
    maxOrderQty?: number | null;
    /** Max order quantity for bulk buyers (null = no limit) */
    maxOrderQtyBulk?: number | null;
    image?: string | null;
    imageUrl?: string | null;
}

export interface Category {
    _id: string;
    name: string;
    slug: string;
    isActive: boolean;
    parent?: string | null;
}

export interface TreeCategory {
    _id: string;
    name: string;
    slug: string;
    isActive: boolean;
    parent?: string | null;
    children?: TreeCategory[];
}

export interface CategoriesResponse {
    success: boolean;
    categories: Category[];
    data?: { categories: TreeCategory[] };
}

export interface ProductFormProps {
    open: boolean;
    item: Product | null;
    onSuccess: () => void;
    onClose: () => void;
}

export interface ProductFormValues {
    name: string;
    slug: string;
    description: string;
    category: string;
    isFeatured: boolean;
    status: 'draft' | 'active' | 'sold';
}

export interface ProductMutationPayload {
    name: string;
    slug: string;
    description: string;
    category: string;
    isFeatured: boolean;
    tags?: string[];
    status?: 'draft' | 'active' | 'sold';
}

export interface SelectedFile {
    file: File;
    preview: string;
}

export interface VariantAttribute {
    key: string;
    values: string[];
}

/** Form state for a single tier row in the UI */
export interface TierFormRow {
    minQty: string;
    maxQty: string;
    type: 'percentage' | 'fixed';
    value: string;
}

export interface NewVariantForm {
    sku: string;
    attributes: { key: string; value: string }[];
    /** Required — variant base price */
    price: string;
    /** Optional — sale price */
    discountedPrice: string;
    inventory: string;
    /** New tiered bulk pricing */
    bulkPricingTiers: TierFormRow[];
    /** Retail discount tiers */
    retailDiscountTiers: TierFormRow[];
    /** Variant weight in kg */
    weight: string;
    /** Free delivery flag */
    freeDelivery: boolean;
    image: string | null;
    /** Max order quantity for normal & guest users (empty = no limit) */
    maxOrderQty: string;
    /** Max order quantity for bulk buyers (empty = no limit) */
    maxOrderQtyBulk: string;
}

/** Weight range entry for delivery rate configuration */
export interface WeightRange {
    minWeight: number;
    maxWeight: number;
    price: number;
}

/** Form state for a weight range row */
export interface WeightRangeFormRow {
    minWeight: string;
    maxWeight: string;
    price: string;
}
