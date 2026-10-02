'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
    ArcElement,
    Chart as ChartJS,
    ChartOptions,
    Legend,
    Tooltip,
    TooltipItem,
} from 'chart.js';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

type KeyOf<T> = Extract<keyof T, string>;

interface DistributionPieChartProps<T> {
  data?: T[];
  isLoading: boolean;

  /** UI */
  title: string;
  description?: string;
  height?: number;
  emptyMessage?: string;

  /** Data mapping */
  labelKey: KeyOf<T>;
  valueKey: KeyOf<T>;

  /** Colors */
  colorMap?: Record<string, string>;
  defaultColor?: string;

  /** Legend */
  legendItems?: { label: string; color: string }[];

  /** Tooltip */
  tooltipFormatter?: (item: T) => string | string[];
}

/* ---------------- helpers ---------------- */

const humanize = (s: string) =>
  s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

/* ---------------- component ---------------- */

export function DistributionPieChartCard<T extends Record<string, unknown>>({
  data,
  isLoading,

  title,
  description,
  height = 320,
  emptyMessage,

  labelKey,
  valueKey,

  colorMap,
  defaultColor = '#9CA3AF',

  legendItems,
  tooltipFormatter,
}: DistributionPieChartProps<T>) {
  const t = useTranslations('sharedCharts');
  const resolvedEmptyMessage = emptyMessage || t('noDistributionDataFound');

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const toNumber = (v: unknown) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return parseFloat(v.replace('%', ''));
      return 0;
    };
    return {
      labels: data.map((d) => String(d[labelKey])),
      datasets: [
        {
          data: data.map((d) => toNumber(d[valueKey])),
          backgroundColor: data.map((d) => {
            const key = String(d[labelKey]);
            return colorMap?.[key] ?? defaultColor;
          }),
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [data, labelKey, valueKey, colorMap, defaultColor]);

  const options: ChartOptions<'pie'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },

        tooltip: {
          enabled: true,
          backgroundColor: '#111827',
          titleColor: '#fff',
          bodyColor: '#F9FAFB',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: () => '',
            label: (ctx: TooltipItem<'pie'>) => {
              if (!data) return '';
              const item = data[ctx.dataIndex];
              if (!item) return '';

              if (tooltipFormatter) {
                return tooltipFormatter(item);
              }

              const label = humanize(String(item[labelKey]));
              const value = item[valueKey];
              return `${label}: ${value}`;
            },
          },
        },
      },
    }),
    [data, tooltipFormatter, labelKey, valueKey],
  );

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-lg" />;
  }

  /* ----- dynamic legend fallback ----- */

  const computedLegend =
    legendItems ??
    data?.map((d) => {
      const key = String(d[labelKey]);
      return {
        label: key,
        color: colorMap?.[key] ?? defaultColor,
      };
    }) ??
    [];

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="relative mb-6 w-full" style={{ height }}>
        {data && data.length > 0 ? (
          <Pie data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">{resolvedEmptyMessage}</p>
          </div>
        )}
      </div>

      {computedLegend.length > 0 && (
        <div
          className={`grid gap-3 sm:gap-4 ${computedLegend.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}
        >
          {computedLegend.map((it, idx) => (
            <div className="flex items-center gap-2" key={idx}>
              <span
                className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: it.color }}
              />
              <span className="text-xs sm:text-sm text-muted-foreground truncate hover:overflow-visible">
                {humanize(it.label)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
