'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryParams } from '@/hooks/use-query-params';
import { AppSelect } from '@/components/shared/form/AppSelect';

interface Props {
  paramKey?: string;
  label?: string;
  placeholder?: string;
  mode?: 'exact' | 'threshold';
}

export function RatingSelectFilter({
  paramKey = 'rating',
  label,
  placeholder,
  mode = 'exact',
}: Props) {
  const t = useTranslations('ratingSelectFilter');
  const tOptions = useTranslations('ratingSelectFilter.options');
  const { getParam, setParams } = useQueryParams();
  const ratingOptions = useMemo(
    () => [
      { key: tOptions('fiveStars'), value: '5' },
      { key: tOptions('fourPlusStars'), value: '4' },
      { key: tOptions('threePlusStars'), value: '3' },
      { key: tOptions('twoPlusStars'), value: '2' },
      { key: tOptions('onePlusStars'), value: '1' },
    ],
    [tOptions],
  );

  const ratingParam = getParam(paramKey);
  const thresholdRatings = ratingParam
    ? ratingParam
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : [];
  const rating =
    mode === 'threshold' && thresholdRatings.length
      ? String(Math.min(...thresholdRatings))
      : ratingParam;

  return (
    <AppSelect
      key={rating || 'empty-rating'}
      name={paramKey}
      label={label}
      placeholder={placeholder || t('placeholder')}
      options={ratingOptions}
      value={rating || ''}
      onValueChange={(value) => {
        const nextValue =
          mode === 'threshold' && value
            ? Array.from({ length: 6 - Number(value) }, (_, index) =>
                String(Number(value) + index),
              ).join(',')
            : value || null;

        setParams({ [paramKey]: nextValue, page: '1' });
      }}
      containerClassName="min-w-[150px]"
      className="rounded-[6px]"
    />
  );
}
