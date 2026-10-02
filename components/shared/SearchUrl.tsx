'use client';

import { SearchInput } from '@/components/shared/SearchInput';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQueryParams } from '@/hooks/use-query-params';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  paramKey?: string;
  debounceMs?: number;
  placeholder?: string;
  minLength?: number;
  containerClass?: string;
  inputClassName?: string;
};

export default function SearchUrl({
  paramKey = 'search',
  debounceMs = 300,
  placeholder,
  minLength = 1,
  containerClass,
  inputClassName,
}: Props) {
  const t = useTranslations('searchUrl');
  const resolvedPlaceholder = placeholder ?? t('searchHere');
  const { getParam, setParams } = useQueryParams();

  const urlValue = getParam(paramKey) ?? '';
  const [text, setText] = useState<string>(urlValue);

  useEffect(() => {
    setText(urlValue);
  }, [urlValue]);

  const debounced = useDebouncedValue(text, debounceMs);

  useEffect(() => {
    const trimmed = debounced.trim();

    if (trimmed.length < minLength) {
      if (urlValue) setParams({ [paramKey]: null, page: '1' });
      return;
    }

    if (trimmed === urlValue) return;

    setParams({ [paramKey]: trimmed, page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, paramKey, minLength]);

  return (
    <SearchInput
      placeholder={resolvedPlaceholder}
      text={text}
      onChangeText={setText}
      containerClass={containerClass}
      inputClassName={inputClassName}
      inputMode="search"
      aria-label={t('search')}
    />
  );
}
