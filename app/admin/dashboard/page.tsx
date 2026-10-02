'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { AppButton } from '@/components/shared/AppButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';

import DashboardChart from '@/components/admin/dashboard/DashboardChart';
import MetricCards, { AdminDashboardMetrics } from '@/components/admin/dashboard/MetricCards';

// ---------- Types ----------

interface DashboardApiResponse {
  success: boolean;
  data: AdminDashboardMetrics;
}

// ---------- Loading Shimmer ----------

function DashboardShimmer() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    </div>
  );
}

// ---------- Dashboard Page ----------

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');
  const tCommon = useTranslations('common');

  const { data, isLoading, isError, error, refetch } =
    useAdminQuery<DashboardApiResponse>(
      adminQueryKeys.dashboard,
      '/analytics/dashboard',
    );

  // Show error toast when fetch fails
  useEffect(() => {
    if (isError && error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('failedToLoad');
      toast.error(typeof message === 'string' ? message : message[0]);
    }
  }, [isError, error, t]);

  if (isLoading) {
    return <DashboardShimmer />;
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {t('failedToLoad')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('failedToLoadDescription')}
          </p>
        </div>
        <AppButton
          variant="primary"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {tCommon('retry')}
        </AppButton>
      </div>
    );
  }

  const metrics = data.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>

      {/* Metric Cards Grid */}
      <MetricCards metrics={metrics} />

      {/* Summary Chart */}
      <DashboardChart metrics={metrics} />
    </div>
  );
}
