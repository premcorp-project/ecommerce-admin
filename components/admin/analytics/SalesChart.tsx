'use client';

import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ---------- Types ----------

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyBreakdown: { date: string; revenue: number; orders: number }[];
}

// ---------- Component ----------

interface SalesChartProps {
  data: SalesData;
}

export default function SalesChart({ data }: SalesChartProps) {
  const t = useTranslations('admin.analytics');
  const { formatCurrency, currencySymbol } = useCurrency();
  const chartData = data.dailyBreakdown ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground">{t('salesOverview')}</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            {t('revenue')}:{' '}
            <strong className="text-foreground">
              {formatCurrency(data.totalRevenue ?? 0)}
            </strong>
          </span>
          <span>
            {t('orders')}:{' '}
            <strong className="text-foreground">{data.totalOrders ?? 0}</strong>
          </span>
          <span>
            {t('aov')}:{' '}
            <strong className="text-foreground">
              {formatCurrency(data.averageOrderValue ?? 0)}
            </strong>
          </span>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${currencySymbol}${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value, name) => [
                name === t('revenue') ? formatCurrency(Number(value)) : value,
                name,
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name={t('revenue')}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#22c55e"
              fillOpacity={0.1}
              fill="#22c55e"
              name={t('orders')}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
