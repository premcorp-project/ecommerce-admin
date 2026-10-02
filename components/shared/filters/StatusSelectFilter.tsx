'use client';

import { AppSelect } from '@/components/shared/form/AppSelect';
import { useQueryParams } from '@/hooks/use-query-params';

interface Props {
  paramKey?: string;
  label?: string;
  placeholder?: string;
  options: { key: string; value: string }[];
}

export function StatusSelectFilter({
  paramKey = 'status',
  label,
  placeholder,
  options,
}: Props) {
  const { getParam, setParams } = useQueryParams();

  const status = getParam(paramKey);
  const normalizedStatus = status === 'all' ? '' : status;

  return (
    <AppSelect
      name={paramKey}
      label={label}
      placeholder={placeholder || 'Select Status'}
      options={options}
      value={normalizedStatus || ''}
      onValueChange={(value) => {
        setParams({ [paramKey]: value || null, page: '1' });
      }}
      containerClassName="min-w-[150px]"
      className="rounded-[6px]"
    />
  );
}
