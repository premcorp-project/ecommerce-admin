'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { downloadReceiptExcel, downloadReceiptPdf } from '@/lib/receipt';
import { useConfig } from '@/hooks/use-config';
import { AppButton } from '@/components/shared/AppButton';
import type { AdminOrderDetail } from './OrderDetail';

interface ReceiptButtonsProps {
  order: AdminOrderDetail;
}

export function ReceiptButtons({ order }: ReceiptButtonsProps) {
  const t = useTranslations('admin.orders');
  const { currency } = useConfig();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  const meta = {
    businessName: 'ChemTech',
    businessEmail: 'hello@chemibuild.com',
    businessWebsite: 'www.chemibuild.com',
    currency,
  };

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      // Try to load logo as base64
      let logoBase64: string | undefined;
      try {
        const res = await fetch('/images/main-logo.png');
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          logoBase64 = `data:image/png;base64,${b64}`;
        }
      } catch {
        /* logo optional */
      }

      await downloadReceiptPdf(order, { ...meta, logoBase64 });
      toast.success(t('detail.receiptDownloaded'));
    } catch {
      toast.error(t('detail.receiptFailed'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExcel = async () => {
    setXlsxLoading(true);
    try {
      await downloadReceiptExcel(order, meta);
      toast.success(t('detail.receiptDownloaded'));
    } catch {
      toast.error(t('detail.receiptFailed'));
    } finally {
      setXlsxLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AppButton
        variant="mute"
        size="sm"
        isLoading={pdfLoading}
        disabled={pdfLoading || xlsxLoading}
        onClick={handlePdf}
        leftIcon={<FileText className="h-3.5 w-3.5" />}
      >
        {t('detail.downloadPdf')}
      </AppButton>
      <AppButton
        variant="mute"
        size="sm"
        isLoading={xlsxLoading}
        disabled={pdfLoading || xlsxLoading}
        onClick={handleExcel}
        leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
      >
        {t('detail.downloadExcel')}
      </AppButton>
    </div>
  );
}
