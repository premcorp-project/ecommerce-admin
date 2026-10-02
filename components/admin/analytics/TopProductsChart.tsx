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

// ---------- Types ----------

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  currentInventory: number;
}

// ---------- Component ----------

interface TopProductsChartProps {
  data: {
    products: TopProduct[];
  };
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  const t = useTranslations('admin.analytics');
  const products = data.products ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-medium text-foreground mb-4">
        {t('topProducts')}
      </h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={products.slice(0, 10)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value) => [value, t('unitsSold')]}
            />
            <Bar dataKey="quantitySold" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
