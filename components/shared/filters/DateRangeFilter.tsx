'use client';

import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { useQueryParams } from '@/hooks/use-query-params';
import { DateRangePicker } from '@/components/shared/form/DateRangePicker';

interface Props {
  startDateParamKey?: string;
  endDateParamKey?: string;
  className?: string;
}

export function DateRangeFilter({
  startDateParamKey = 'startDate',
  endDateParamKey = 'endDate',
  className,
}: Props) {
  const t = useTranslations('common.filters');
  const { getParam, setParams } = useQueryParams();

  const startDate = getParam(startDateParamKey);
  const endDate = getParam(endDateParamKey);

  return (
    <DateRangePicker
      placeholder={t('dateRangePlaceholder')}
      className={className}
      date={
        startDate && endDate
          ? { from: parseISO(startDate), to: parseISO(endDate) }
          : undefined
      }
      onDateChange={(range) => {
        setParams({
          [startDateParamKey]: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
          [endDateParamKey]: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
          page: '1',
        });
      }}
    />
  );
}
