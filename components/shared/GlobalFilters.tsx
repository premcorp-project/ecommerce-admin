'use client';

import { useQueryParams } from '@/hooks/use-query-params';
import { format, parseISO } from 'date-fns';
import { FilterX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppButton } from './AppButton';
import { MultiSelect } from './form/AppMultiSelect';
import { AppSelect, SelectOption } from './form/AppSelect';
import { DateRangePicker } from './form/DateRangePicker';
import SearchUrl from './SearchUrl';

export type Filter = {
  paramName: string;
  placeholder?: string;
} & (
  | { type: 'search' }
  | { type: 'date' }
  | {
      type: 'select';
      options: SelectOption[];
    }
  | {
      type: 'multiselect';
      options: string[];
      mapping: { [key: string]: string };
      reverseMapping: { [key: string]: string };
    }
);

export type GlobalFiltersProps = {
  filters: Filter[];
};

export function GlobalFilters({ filters }: GlobalFiltersProps) {
  const t = useTranslations('common.filters');
  const { getParam, setParams } = useQueryParams();

  const handleClear = () => {
    const paramsToClear = filters.reduce(
      (acc, filter) => {
        acc[filter.paramName] = null;
        return acc;
      },
      {} as Record<string, null>,
    );
    setParams({ ...paramsToClear, page: '1' });
  };

  const isAnyFilterActive = filters.some((filter) => getParam(filter.paramName));

  return (
    <div className="flex items-center flex-wrap gap-2">
      {filters.map((filter) => {
        const { paramName, placeholder } = filter;

        if (filter.type === 'search') {
          return (
            <SearchUrl
              key={paramName}
              paramKey={paramName}
              placeholder={placeholder}
              containerClass="max-w-sm"
              inputClassName="h-11 rounded-[6px]"
            />
          );
        }

        if (filter.type === 'date') {
          const startDate = getParam('startDate') || '';
          const endDate = getParam('endDate') || '';

          return (
            <DateRangePicker
              key={paramName}
              placeholder={placeholder || ''}
              date={
                startDate && endDate
                  ? { from: parseISO(startDate), to: parseISO(endDate) }
                  : undefined
              }
              onDateChange={(range) => {
                setParams({
                  startDate: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
                  endDate: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
                  page: '1',
                });
              }}
            />
          );
        }

        if (filter.type === 'select') {
          const value = getParam(paramName);
          return (
            <AppSelect
              key={paramName}
              name={paramName}
              placeholder={placeholder}
              options={filter.options}
              value={value || ''}
              onValueChange={(val) => {
                setParams({ [paramName]: val, page: '1' });
              }}
              containerClassName="max-w-[150px]"
              className="rounded-[6px]"
            />
          );
        }

        if (filter.type === 'multiselect') {
          const value = getParam(paramName);
          return (
            <MultiSelect
              key={paramName}
              options={filter.options}
              selected={
                value
                  ? (value as string)
                      .split(',')
                      .map((type) => filter.reverseMapping[type])
                      .filter(Boolean)
                  : []
              }
              onChange={(newTypes) => {
                const mappedTypes = newTypes
                  .map((type) => filter.mapping[type])
                  .filter(Boolean);
                setParams({
                  [paramName]:
                    mappedTypes.length > 0 ? mappedTypes.join(',') : null,
                  page: '1',
                });
              }}
              placeholder={placeholder}
              className="shadow-sm"
            />
          );
        }

        return null;
      })}
      {isAnyFilterActive && (
        <AppButton variant="mute" onClick={handleClear} leftIcon={<FilterX size={16} />}>
          {t('clearFilters')}
        </AppButton>
      )}
    </div>
  );
}
