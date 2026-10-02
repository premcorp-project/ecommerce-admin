'use client';

import { ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ---------- Types ----------

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  orderStatusDistribution: { status: string; count: number }[];
  paymentMethodDistribution: { method: string; count: number; total: number }[];
}

// ---------- Component ----------

interface CustomerMetricsCardsProps {
  metrics: CustomerMetrics;
}

export default function CustomerMetricsCards({ metrics }: CustomerMetricsCardsProps) {
  const t = useTranslations('admin.analytics');

  const cards = [
    {
      label: t('totalCustomers'),
      value: (metrics.totalCustomers ?? 0).toLocaleString(),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: t('newCustomers'),
      value: (metrics.newCustomers ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: t('activeCustomers'),
      value: (metrics.activeCustomers ?? 0).toLocaleString(),
      icon: ShoppingBag,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <div className={`p-2 rounded-md ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
