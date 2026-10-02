'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { downloadExcel } from '@/lib/download';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useConfig } from '@/hooks/use-config';
import { AppButton } from './AppButton';

interface Column<T> {
  header: string;
  dataKey: string;
  formatter?: (item: T) => string;
}

interface DownloadButtonsProps<T> {
  fileName: string;
  data: T[];
  columns: Column<T>[];
  title?: string;
  className?: string;
}

export function DownloadButtons<T extends object>({
  fileName,
  data,
  columns,
  title,
  className,
}: DownloadButtonsProps<T>) {
  const t = useTranslations('common');
  const { currency } = useConfig();
  const normalizedData = data as unknown as Record<string, unknown>[];

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      await downloadExcel(fileName, columns as never, normalizedData, {
        title:
          title ??
          fileName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        businessName: 'OttimoDirect',
        currency,
      });
      toast.success(t('excelDownloadSuccess'));
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div
      className={cn('flex flex-wrap gap-2 items-end justify-start', className)}
    >
      <AppButton
        variant="mute"
        disabled={!data.length || isExporting}
        isLoading={isExporting}
        leftIcon={
          !isExporting ? (
            <Image
              src={toAbsoluteUrl('/images/excel.png')}
              width={20}
              height={20}
              alt={t('downloadExcel')}
              style={{ width: 'auto', height: 'auto' }}
            />
          ) : undefined
        }
        onClick={handleDownloadExcel}
      >
        <span>{t('downloadExcel')}</span>
      </AppButton>
    </div>
  );
}
