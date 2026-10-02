'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import {
  CategoryScale,
  ChartData,
  ChartDataset,
  Chart as ChartJS,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipItem,
} from 'chart.js';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { Line } from 'react-chartjs-2';

interface Series {
  key: string;
  label: string;
  unit?: string;
  points: { t: string; v: number }[];
}

interface Meta {
  granularity: string;
  from: string;
  to: string;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

/* ---------------- helpers ---------------- */

const formatCompact = (v: number) => {
  if (v >= 1_000_000_000) return `${Math.round(v / 1_000_000_000)}B`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${v}`;
};

const formatCurrencyValue = (v: number, symbol: string) =>
  `${symbol} ${v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const getLabel = (t: string, granularity: string) => {
  if (granularity === 'year') return t;

  if (granularity === 'month') {
    const [y, m] = t.split('-').map(Number);
    return moment(new Date(y, m - 1, 1)).format('MMM');
  }

  if (granularity === 'week' || granularity === 'day') {
    return moment(t).format('MMM D');
  }

  return t;
};

interface RevenueDataset extends ChartDataset<'line', number[]> {
  unit?: string;
}

/* ---------------- transform ---------------- */

function toChartData(
  series: Series[],
  granularity: string,
  seriesColors: Record<string, { line: string; fill: string }>,
) {
  if (!series?.length || !series[0].points) {
    return { labels: [], datasets: [] };
  }

  const labels = series[0].points.map((p) => getLabel(p.t, granularity));

  const datasets: RevenueDataset[] = series.map((s) => {
    const color = seriesColors[s.key] ?? {
      line: '#3B82F6',
      fill: 'rgba(59,130,246,0.12)',
    };

    return {
      label: s.label,
      data: s.points.map((p) => p.v),
      borderColor: color.line,
      backgroundColor: color.fill,
      pointBackgroundColor: color.line,
      pointBorderColor: '#fff',
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
      yAxisID: s.unit === 'currency' ? 'y1' : 'y',
      unit: s.unit,
    };
  });

  return { labels, datasets };
}

/* ---------------- props ---------------- */

interface LineChartCardProps {
  title: string;
  description?: string;
  noDataMessage?: string;
  series?: Series[];
  meta?: Meta;
  isLoading: boolean;
  seriesColors: Record<string, { line: string; fill: string }>;
  legendItems?: {
    label: string;
    color: string;
  }[];
  height?: number;
}

/* ---------------- component ---------------- */

export function LineChartCard({
  title,
  description,
  noDataMessage,
  series,
  meta,
  isLoading,
  seriesColors,
  legendItems,
  height = 400,
}: LineChartCardProps) {
  const t = useTranslations('sharedCharts');
  const { currencySymbol } = useCurrency();
  const resolvedCurrencySymbol = currencySymbol || '$';
  const resolvedNoDataMessage = noDataMessage || t('noDataFound');

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  const granularity = meta?.granularity || 'month';

  const { labels, datasets } = toChartData(
    series || [],
    granularity,
    seriesColors,
  );

  const data: ChartData<'line'> = { labels, datasets };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },

    plugins: {
      legend: { display: false },

      tooltip: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        usePointStyle: true,
        callbacks: {
          title: (items) => items[0]?.label || '',
          label: (ctx: TooltipItem<'line'>) => {
            const ds = ctx.dataset as RevenueDataset;
            const y = ctx.parsed.y ?? 0;

            if (ds.unit === 'currency') {
              return `${ds.label}: ${formatCurrencyValue(y, resolvedCurrencySymbol)}`;
            }

            return `${ds.label}: ${Math.round(y)}`;
          },
        },
      },
    },

    /* ✅ axes kept static as requested */

    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#E5E7EB' },
        ticks: {
          color: '#6B7280',
          font: { size: 12 },
        },
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#6B7280',
          font: { size: 12 },
          callback: (v) => `${formatCompact(Number(v))}`,
        },
      },
      x: {
        grid: { color: '#E5E7EB' },
        ticks: { color: '#6B7280', font: { size: 12 } },
      },
    },
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs sm:text-sm text-mute">{description}</p>}
        </div>

        {legendItems && (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {legendItems.map((l) => (
              <LegendDot key={l.label} {...l} />
            ))}
          </div>
        )}
      </div>

      <div className="w-full" style={{ height }}>
        {series && series.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-mute">{resolvedNoDataMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- legend ---------------- */

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
