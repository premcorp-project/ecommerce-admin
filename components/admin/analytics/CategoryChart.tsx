'use client';

import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from 'next-intl';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// ---------- Types ----------

export interface CategoryPerformance {
  categoryId: string;
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
}

// ---------- Constants ----------

const PIE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

// ---------- Component ----------

interface CategoryChartProps {
  data: {
    categories: CategoryPerformance[];
  };
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const t = useTranslations('admin.analytics');
  const { formatCurrency } = useCurrency();
  const categories = data.categories ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-medium text-foreground mb-4">
        {t('categoryPerformance')}
      </h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categories}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="revenue"
              nameKey="name"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {categories.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value) => [formatCurrency(Number(value)), t('revenue')]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
