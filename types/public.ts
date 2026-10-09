/**
 * Public TypeScript Types — ChemTech Customer Storefront
 *
 * All interfaces derived from CUSTOMER_SITE_GUIDE.md Section 14.
 * These types are used exclusively in app/(public)/ and components/public/.
 * Never import admin types here.
 */

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface Category {
    _id: string;
    name: string;
    slug: string;
    image?: { url: string; publicId: string };
    parent?: string | null;
    children?: Category[];
}

export interface Tag {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: { url: string; publicId: string };
    isActive: boolean;
    productCount?: number;
    createdAt: string;
}

export interface Banner {
    _id: string;
    title: string;
    /** Nested image object from the admin API */
    image: { url: string; publicId: string };
    link: string;
    position: number;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VariantAttribute {
    key: string;
    values: string[];
}

/**
 * Product as returned by the listing endpoint.
 * NOTE: `variants` is ONLY present on the detail endpoint response.
 * The listing endpoint returns `minPrice`, `inventory`, and `available` instead.
 */
export interface Product {
    _id: string;
    id?: string; // some API responses use 'id' instead of '_id'
    name: string;
    slug: string;
    description: string; // HTML string — always render via RichContent, never dangerouslySetInnerHTML
    category: { _id: string; name: string; slug: string };
    images: { url: string; publicId: string }[];
    isFeatured: boolean;
    status: 'active' | 'sold' | 'draft';
    variantAttributes: VariantAttribute[];
    averageRating: number;
    reviewCount: number;
    /**
     * Raw product IDs — NOT populated objects.
     * Fetch each product separately via GET /catalog/products/:id.
     */
    frequentlyBoughtTogether: string[];
    /**
     * Computed from active variants. null when the product has no active variants.
     * Always handle the null case — show a fallback string, never crash.
     */
    minPrice: number | null;
    /**
     * Original price of the variant with the lowest effective price.
     * null when there's no discount (minPrice equals the base price).
     * Show with strikethrough when not null.
     */
    minOriginalPrice: number | null;
    inventory: number;
    available: boolean;
    /**
     * Only present on the detail endpoint (GET /catalog/products/:idOrSlug).
     * Never available on listing responses.
     */
    variants?: Variant[];
}

/** A single tier entry for bulk pricing (bulk buyers) or retail discount (normal/guest) */
export interface PricingTier {
    minQty: number;
    maxQty: number | null;
    type: 'percentage' | 'fixed';
    value: number;
}

/** Retail discount tier — maxQty is always required (never null) */
export interface RetailDiscountTier {
    minQty: number;
    maxQty: number;
    type: 'percentage' | 'fixed';
    value: number;
}

/** Pricing type returned on order items */
export type PricingType = 'bulk_tier' | 'retail_discount' | 'coupon_override' | 'retail';

/**
 * Variant — only returned by the product detail endpoint.
 */
export interface Variant {
    _id: string;
    sku: string;
    attributes: { key: string; value: string }[];
    price: number;
    discountedPrice: number | null;
    /**
     * Pre-calculated by the backend: discountedPrice ?? price.
     * Always use this for display — never recalculate on the frontend.
     * This field is always a number, never null.
     */
    effectivePrice: number;
    /** Tiered bulk pricing for bulk buyers */
    bulkPricingTiers?: PricingTier[];
    /** Retail discount tiers for normal/guest users */
    retailDiscountTiers?: RetailDiscountTier[];
    /** Variant weight in kg (used for delivery fee calculation) */
    weight?: number | null;
    /** If true, weight excluded from delivery fee for normal users */
    freeDelivery?: boolean;
    /** Max order quantity for normal & guest users (null = no limit) */
    maxOrderQty?: number | null;
    /** Max order quantity for bulk buyers (null = no limit) */
    maxOrderQtyBulk?: number | null;
    inventory: number;
    available: boolean;
    image: string | null;
    imageUrl: string | null; // resolved URL — use directly in next/image src
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

/**
 * The variant shape as embedded in a cart item.
 * NOTE: CartItemVariant does NOT have `effectivePrice`.
 * Compute display price as: variant.discountedPrice ?? variant.price
 */
export interface CartItemVariant {
    _id: string;
    sku: string;
    attributes: { key: string; value: string }[];
    price: number;
    discountedPrice: number | null;
    /** Free delivery flag — true/false for normal users, null for bulk buyers (doesn't apply) */
    freeDelivery?: boolean | null;
    /** Max order quantity for normal & guest users (null = no limit) */
    maxOrderQty?: number | null;
    /** Max order quantity for bulk buyers (null = no limit) */
    maxOrderQtyBulk?: number | null;
    inventory: number;
    image: string | null;
}

export interface CartItemProduct {
    _id: string;
    name: string;
    slug: string;
    images: { url: string; publicId: string }[];
    variantAttributes: VariantAttribute[];
}

export interface CartItem {
    /**
     * The identifier for this cart item.
     * Use this `_id` as `:itemId` in PUT /orders/cart/:itemId and DELETE /orders/cart/:itemId.
     * NEVER use productId or variantId for cart mutations.
     */
    _id: string;
    product: CartItemProduct;
    variant: CartItemVariant;
    quantity: number;
}

export interface Cart {
    items: CartItem[];
    itemCount: number;
}

// ─── Guest Cart (localStorage) ────────────────────────────────────────────────

/**
 * Denormalised cart item stored in localStorage for unauthenticated users.
 * All display data is stored at add-to-cart time so the cart can render without API calls.
 * Key: 'chemibuild_guest_cart'
 */
export interface GuestCartItem {
    productId: string;
    variantId: string;
    quantity: number;
    // Denormalised display data — stored at add-to-cart time
    productName: string;
    productSlug: string;
    productImage: string | null;
    variantSku: string;
    variantAttributes: { key: string; value: string }[];
    variantPrice: number;
    variantDiscountedPrice: number | null;
}

export interface GuestCart {
    items: GuestCartItem[];
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
    _id: string;
    product: {
        _id: string;
        name: string;
        slug: string;
        images: { url: string; publicId: string }[];
        variantAttributes?: VariantAttribute[];
    };
    /** Lowest variant price across the product (denormalised on the item) */
    minPrice: number | null;
    /** Pre-calculated price (`discountedPrice ?? price`) — show as the main price */
    effectivePrice: number | null;
    /** Stock-availability flag at the time of fetch */
    available: boolean;
    /** ISO timestamp when the item was added to the wishlist */
    addedAt: string;
}

export interface Wishlist {
    items: WishlistItem[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'ready_for_pickup'
    | 'shipped'
    | 'delivered'
    | 'picked_up'
    | 'cancelled'
    | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cod_pending' | 'cop_pending';

export type DeliveryMethod = 'delivery' | 'pickup';

export interface OrderItem {
    product: { _id: string; name: string; slug: string };
    variant: { _id: string; sku: string; attributes: { key: string; value: string }[] };
    quantity: number;
    /** Unit price at time of order (after discount) */
    unitPrice: number;
    /** Total price for this line item (unitPrice × quantity) */
    totalPrice: number;
    /** Whether bulk pricing was applied */
    isBulkPriceApplied?: boolean;
    /** Pricing type that was applied to this item */
    pricingType?: PricingType;
}

export interface DeliveryAddress {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
}

export interface Order {
    _id: string;
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    deliveryMethod: DeliveryMethod;
    paymentMethod: 'stripe' | 'cod' | 'cop';
    paymentStatus: PaymentStatus;
    items: OrderItem[];
    deliveryAddress: DeliveryAddress | null;
    guestPhone?: string;
    subtotal: number;
    deliveryFee: number;
    discountAmount: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
    currency?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Lightweight order shape returned by the order list endpoint.
 * Does not include full items or delivery address.
 */
export interface OrderSummary {
    _id: string;
    orderId: string;
    orderNumber?: string;
    status: OrderStatus;
    deliveryMethod?: DeliveryMethod;
    paymentMethod: 'stripe' | 'cod' | 'cop';
    paymentStatus: PaymentStatus;
    total: number;
    itemCount: number;
    createdAt: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface Address {
    _id: string;
    label?: string;
    fullName?: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    isDefault: boolean;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: 'customer' | 'admin';
    /**
     * When true: bulk pricing tiers are visible; BulkPricingTable renders;
     * bulk price is applied when quantity >= variant.bulkPricing.minQuantity.
     * When false or user is a guest: always show effectivePrice; BulkPricingTable is hidden.
     */
    hasBulkAccess: boolean;
    /**
     * When true: COD payment option is shown in PaymentSelector.
     * When false or user is a guest: only Stripe is shown; COD option is never rendered.
     */
    hasCODAccess: boolean;
    createdAt: string;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
    _id: string;
    user: { _id: string; name: string };
    rating: number;
    comment?: string;
    createdAt: string;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export interface TicketMessage {
    _id: string;
    sender: string | { _id: string; name: string; email?: string };
    body: string;
    message?: string;
    sentAt?: string;
    createdAt?: string;
}

export interface Ticket {
    _id: string;
    ticketNumber: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    messages: TicketMessage[];
    lastMessageAt: string;
    createdAt: string;
}

// ─── Product Listing ──────────────────────────────────────────────────────────

/**
 * A single attribute filter group returned by the listing endpoint.
 * Keys are dynamic — never hardcode attribute keys like "Color" or "Size".
 * Iterate over the array and render one checkbox group per key.
 */
export interface AttributeFilter {
    key: string;
    values: string[];
}

export interface AvailableFilters {
    /**
     * Dynamic attribute filter groups.
     * Each entry has a `key` (e.g. "Volume", "Concentration") and its available `values`.
     * Attribute keys are NEVER hardcoded — always iterate over this array.
     * When empty, hide the attribute filter section entirely.
     */
    attributes: AttributeFilter[];
    /** Price range uses effective price (discountedPrice if set, otherwise price). */
    priceRange: { min: number; max: number };
}

export interface Pagination {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface ProductListResponse {
    products: Product[];
    pagination: Pagination;
    availableFilters: AvailableFilters;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CouponValidationResult {
    valid: boolean;
    /** The discount amount calculated by the backend */
    discount: number;
    /** Optional fields that may be returned */
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmount?: number;
    finalTotal?: number;
    message?: string;
}

export interface CreateOrderResponse {
    orderId: string;
    orderNumber: string;
    /**
     * Present for Stripe payments; null for COD orders.
     * When non-null, use clientSecret with Stripe Elements to confirm payment.
     */
    paymentIntent: {
        clientSecret: string;
        amount: number;
        currency: string;
    } | null;
    total: number;
    deliveryFee: number;
    discountAmount: number;
}
