/**
 * React Query key factory for the admin dashboard.
 * Follows a consistent ['admin', module, params?] pattern for cache management.
 */

export interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    status?: string;
    [key: string]: unknown;
}

export interface AnalyticsParams {
    period?: 'today' | '7d' | '30d' | '90d' | 'custom';
    startDate?: string;
    endDate?: string;
}

export const adminQueryKeys = {
    dashboard: ['admin', 'dashboard'] as const,
    orders: (params: QueryParams) => ['admin', 'orders', params] as const,
    orderDetail: (orderId: string) => ['admin', 'order-detail', orderId] as const,
    products: (params: QueryParams) => ['admin', 'products', params] as const,
    categories: () => ['admin', 'categories'] as const,
    customers: (params: QueryParams) => ['admin', 'customers', params] as const,
    analytics: (params: AnalyticsParams) => ['admin', 'analytics', params] as const,
    banners: () => ['admin', 'banners'] as const,
    coupons: (params: QueryParams) => ['admin', 'coupons', params] as const,
    support: (params: QueryParams) => ['admin', 'support', params] as const,
    settings: () => ['admin', 'settings'] as const,
    deliveryRates: () => ['admin', 'delivery-rates'] as const,
    deliveryZones: (params?: QueryParams) => ['admin', 'delivery-zones', params] as const,
    deliveryZoneDetail: (id: string) => ['admin', 'delivery-zone-detail', id] as const,
    bulkBuyers: (params: QueryParams) => ['admin', 'bulk-buyers', params] as const,
    cod: (params: QueryParams) => ['admin', 'cod', params] as const,
    staff: (params: QueryParams) => ['admin', 'staff', params] as const,
    tags: () => ['admin', 'tags'] as const,
};
