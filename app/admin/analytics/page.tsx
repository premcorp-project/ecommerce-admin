'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { AppButton } from '@/components/shared/AppButton';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys, AnalyticsParams } from '@/lib/api/admin-query-keys';

import CategoryChart, { CategoryPerformance } from '@/components/admin/analytics/CategoryChart';
import CustomerMetricsCards, { CustomerMetrics } from '@/components/admin/analytics/CustomerMetricsCards';
import SalesChart, { SalesData } from '@/components/admin/analytics/SalesChart';
import TopProductsChart, { TopProduct } from '@/components/admin/analytics/TopProductsChart';

// ---------- Response Types ----------

interface SalesResponse {
  success: boolean;
  data: SalesData;
}

interface TopProductsResponse {
  success: boolean;
  data: {
    products: TopProduct[];
  };
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: CategoryPerformance[];
  };
}

interface CustomersResponse {
  success: boolean;
  data: CustomerMetrics;
}

// ---------- Component ----------

export default function AnalyticsPage() {
  const t = useTranslations('admin.analytics');
  const tCommon = useTranslations('common');
  const { getParam } = useQueryParams();

  // Read filter state from URL params
  const period = (getParam('period') as AnalyticsParams['period']) || '30d';
  const startDate = getParam('startDate') || undefined;
  const endDate = getParam('endDate') || undefined;

  // Build query params for API calls
  const analyticsParams: AnalyticsParams = useMemo(() => {
    const params: AnalyticsParams = { period };
    if (period === 'custom' && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    return params;
  }, [period, startDate, endDate]);

  // Don't fetch when custom period is selected but dates are missing
  const shouldFetch = period !== 'custom' || (!!startDate && !!endDate);

  // Build axios config with query params
  const axiosConfig = useMemo(
    () => ({ params: analyticsParams }),
    [analyticsParams],
  );

  // Fetch analytics data from 4 endpoints
  const salesQuery = useAdminQuery<SalesResponse>(
    [...adminQueryKeys.analytics(analyticsParams), 'sales'] as const,
    '/analytics/sales',
    { enabled: shouldFetch },
    axiosConfig,
  );

  const topProductsQuery = useAdminQuery<TopProductsResponse>(
    [...adminQueryKeys.analytics(analyticsParams), 'top-products'] as const,
    '/analytics/top-products',
    { enabled: shouldFetch },
    axiosConfig,
  );

  const categoriesQuery = useAdminQuery<CategoriesResponse>(
    [...adminQueryKeys.analytics(analyticsParams), 'categories'] as const,
    '/analytics/categories',
    { enabled: shouldFetch },
    axiosConfig,
  );

  const customersQuery = useAdminQuery<CustomersResponse>(
    [...adminQueryKeys.analytics(analyticsParams), 'customers'] as const,
    '/analytics/customers',
    { enabled: shouldFetch },
    axiosConfig,
  );

  const isLoading =
    salesQuery.isLoading ||
    topProductsQuery.isLoading ||
    categoriesQuery.isLoading ||
    customersQuery.isLoading;

  const isError =
    salesQuery.isError ||
    topProductsQuery.isError ||
    categoriesQuery.isError ||
    customersQuery.isError;

  const handleRetry = useCallback(() => {
    salesQuery.refetch();
    topProductsQuery.refetch();
    categoriesQuery.refetch();
    customersQuery.refetch();
  }, [salesQuery, topProductsQuery, categoriesQuery, customersQuery]);

  // Filter configuration for GlobalFilters
  const filters: Filter[] = useMemo(() => {
    const baseFilters: Filter[] = [
      {
        type: 'select',
        paramName: 'period',
        placeholder: t('selectPeriod'),
        options: [
          { key: t('periods.today'), value: 'today' },
          { key: t('periods.sevenDays'), value: '7d' },
          { key: t('periods.thirtyDays'), value: '30d' },
          { key: t('periods.ninetyDays'), value: '90d' },
          { key: t('periods.custom'), value: 'custom' },
        ],
      },
    ];

    // Show date range picker only when custom period is selected
    if (period === 'custom') {
      baseFilters.push({
        type: 'date',
        paramName: 'dateRange',
        placeholder: t('selectDateRange'),
      });
    }

    return baseFilters;
  }, [period, t]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <GlobalFilters filters={filters} />

      {/* Error State */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {t('failedToLoad')}
          </p>
          <AppButton
            variant="secondary"
            onClick={handleRetry}
            leftIcon={<RefreshCw size={16} />}
          >
            {tCommon('retry')}
          </AppButton>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <AnalyticsShimmer />}

      {/* Data Content */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Customer Metrics Cards */}
          {customersQuery.data?.data && (
            <CustomerMetricsCards metrics={customersQuery.data.data} />
          )}

          {/* Sales Chart */}
          {salesQuery.data?.data && (
            <SalesChart data={salesQuery.data.data} />
          )}

          {/* Bottom Row: Top Products + Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {topProductsQuery.data?.data && (
              <TopProductsChart data={topProductsQuery.data.data} />
            )}
            {categoriesQuery.data?.data && (
              <CategoryChart data={categoriesQuery.data.data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Loading Shimmer ----------

function AnalyticsShimmer() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metric cards shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-md" />
            </div>
            <div className="h-7 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Sales chart shimmer */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="h-[300px] bg-muted rounded" />
      </div>

      {/* Bottom row shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-5 w-28 bg-muted rounded mb-4" />
          <div className="h-[300px] bg-muted rounded" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-5 w-36 bg-muted rounded mb-4" />
          <div className="h-[300px] bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
