'use client';

import {
    CalendarCheck,
    Clock,
    DollarSign,
    Package,
    ShoppingCart,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCurrency } from '@/hooks/use-currency';

// ---------- Types ----------

export interface AdminDashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  todaysOrders: number;
  todaysRevenue: number;
}

// ---------- Helpers ----------

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-GB').format(num);
}

// ---------- Metric Card ----------

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
}

function MetricCard({ title, value, icon, iconBgColor }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgColor}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Component ----------

interface MetricCardsProps {
  metrics: AdminDashboardMetrics;
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  const t = useTranslations('admin.dashboard');
  const { formatCurrency } = useCurrency();

  const cards = [
    {
      title: t('totalOrders'),
      value: formatNumber(metrics.totalOrders),
      icon: <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: t('totalRevenue'),
      value: formatCurrency(metrics.totalRevenue),
      icon: <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />,
      iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: t('totalCustomers'),
      value: formatNumber(metrics.totalCustomers),
      icon: <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: t('totalProducts'),
      value: formatNumber(metrics.totalProducts),
      icon: <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
      iconBgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: t('pendingOrders'),
      value: formatNumber(metrics.pendingOrders),
      icon: <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />,
      iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: t('todayOrders'),
      value: formatNumber(metrics.todaysOrders),
      icon: <CalendarCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      title: t('todayRevenue'),
      value: formatCurrency(metrics.todaysRevenue),
      icon: <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <MetricCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconBgColor={card.iconBgColor}
        />
      ))}
    </div>
  );
}
