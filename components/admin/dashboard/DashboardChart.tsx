'use client';

import { useTranslations } from 'next-intl';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { AdminDashboardMetrics } from './MetricCards';

// ---------- Component ----------

interface DashboardChartProps {
  metrics: AdminDashboardMetrics;
}

export default function DashboardChart({ metrics }: DashboardChartProps) {
  const t = useTranslations('admin.dashboard');

  const chartData = [
    { name: t('totalOrders'), value: metrics.totalOrders },
    { name: t('pendingOrders'), value: metrics.pendingOrders },
    { name: t('todayOrders'), value: metrics.todaysOrders },
    { name: t('totalCustomers'), value: metrics.totalCustomers },
    { name: t('totalProducts'), value: metrics.totalProducts },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {t('overview')}
      </h2>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              name={t('value')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
