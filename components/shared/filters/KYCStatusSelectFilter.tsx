'use client';

import { useQueryParams } from '@/hooks/use-query-params';
import { AppSelect } from '@/components/shared/form/AppSelect';

interface Props {
  paramKey?: string;
}

const KYCStatus = [
  { key: 'Pending', value: 'pending' },
  { key: 'Verified', value: 'verified' },
  { key: 'Rejected', value: 'rejected' },
];

export function KYCStatusSelectFilter({ paramKey = 'kycStatus' }: Props) {
  const { getParam, setParams } = useQueryParams();

  const kycStatusOptions =
    KYCStatus?.map((kycStatus) => ({
      key: kycStatus.key,
      value: kycStatus.value,
    })) || [];

  const kycStatus = getParam(paramKey);

  return (
    <AppSelect
      name="kycStatus"
      placeholder={'KYC Status'}
      options={kycStatusOptions}
      value={kycStatus || ''}
      onValueChange={(value) => {
        setParams({ [paramKey]: value, page: '1' });
      }}
      containerClassName="max-w-[150px]"
      className="rounded-[6px]"
      //   disabled={isLoading}
    />
  );
}
