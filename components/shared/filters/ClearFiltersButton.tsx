'use client';

import { FilterX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryParams } from '@/hooks/use-query-params';
import { AppButton } from '@/components/shared/AppButton';

type Props = {
  paramKeys: string[];
};

export function ClearFiltersButton({ paramKeys }: Props) {
  const t = useTranslations('common.filters');
  const { getParam, setParams } = useQueryParams();

  const clearAllFilters = () => {
    const paramsToClear = paramKeys.reduce(
      (acc, key) => {
        acc[key] = null;
        return acc;
      },
      {} as Record<string, null>,
    );
    setParams({ ...paramsToClear, page: '1' });
    // no-op: do not dispatch external events
  };

  const hasAnyFilter = paramKeys.some((key) => getParam(key));

  return (
    <>
      {hasAnyFilter && (
        <AppButton
          variant="secondary"
          onClick={clearAllFilters}
          className="text-primary/70"
        >
          <FilterX size={16} className="mr-2 h-11!" />
          {t('clearFilters')}
        </AppButton>
      )}
    </>
  );
}
