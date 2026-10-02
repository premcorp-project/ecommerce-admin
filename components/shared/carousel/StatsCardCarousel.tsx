'use client';

import { LucideIcon } from 'lucide-react';
import { resolveCurrencySymbol } from '@/lib/formatCurrency';
import { useCurrency } from '@/hooks/use-currency';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/StatCard';
import DisplayError from '../DisplayError';

interface StatItem {
  title: string;
  value: string;
  isPositive: boolean;
  icon: LucideIcon;
  change: number;
  useCurrencyPrefix?: boolean;
}

export const StatsCardCarousel = ({
  statsData,
  isLoading,
  error,
  isError,
}: {
  statsData: StatItem[];
  isLoading?: boolean;
  error?: string | null;
  isError?: boolean;
}) => {
  const { currencySymbol } = useCurrency();
  const resolvedCurrencySymbol = resolveCurrencySymbol(currencySymbol);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <DisplayError title="Error Fetching Dashboard Stats" message={error} />
    );
  }

  const count = statsData.length;

  // ---------- GRID MODE (<=4) ----------
  if (count <= 4) {
    const gridCols =
      count === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : count === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : count === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1';

    return (
      <div className={`grid ${gridCols} gap-4 w-full`}>
        {statsData.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={
              stat.useCurrencyPrefix === false
                ? stat.value
                : `${resolvedCurrencySymbol} ${stat.value}`
            }
            isPositive={stat.isPositive}
            icon={stat.icon}
            change={stat.change}
          />
        ))}
      </div>
    );
  }

  // ---------- CAROUSEL MODE (>4) ----------
  return (
    <Carousel
      opts={{ align: 'start', slidesToScroll: 1 }}
      className="relative w-full"
    >
      <CarouselContent className="gap-4">
        {statsData.map((stat, index) => (
          <CarouselItem
            key={index}
            className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
          >
            <StatCard
              title={stat.title}
              value={
                stat.useCurrencyPrefix === false
                  ? stat.value
                  : `${resolvedCurrencySymbol} ${stat.value}`
              }
              isPositive={stat.isPositive}
              icon={stat.icon}
              change={stat.change}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 disabled:hidden" />
      <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 disabled:hidden" />
    </Carousel>
  );
};
