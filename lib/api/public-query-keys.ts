/**
 * React Query key factory for the public customer storefront.
 * All keys follow the ['public', ...] format for clear separation from admin keys.
 */

export const publicQueryKeys = {
    featuredProducts: ['public', 'featured-products'] as const,
    banners: ['public', 'banners'] as const,
    categories: ['public', 'categories'] as const,
    products: (params: string) => ['public', 'products', params] as const,
    product: (slug: string) => ['public', 'product', slug] as const,
    cart: ['public', 'cart'] as const,
    wishlist: ['public', 'wishlist'] as const,
    wishlistCheck: (productId: string) => ['public', 'wishlist-check', productId] as const,
    orders: ['public', 'orders'] as const,
    order: (orderId: string) => ['public', 'order', orderId] as const,
    profile: ['public', 'profile'] as const,
    addresses: ['public', 'addresses'] as const,
    reviews: (productId: string) => ['public', 'reviews', productId] as const,
    tickets: ['public', 'tickets'] as const,
    ticket: (ticketId: string) => ['public', 'ticket', ticketId] as const,
    config: ['public', 'config'] as const,
    bestSellers: ['public', 'best-sellers'] as const,
    newArrivals: ['public', 'new-arrivals'] as const,
    tags: ['public', 'tags'] as const,
    deliveryCountries: ['public', 'delivery-countries'] as const,
    deliveryCities: (country: string) => ['public', 'delivery-cities', country] as const,
    deliveryCheck: (country: string, city: string) => ['public', 'delivery-check', country, city] as const,
};
