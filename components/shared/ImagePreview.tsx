'use client';

import { AppButton } from '@/components/shared/AppButton';
import { AppDialog } from '@/components/shared/AppDialog';
import { cn } from '@/lib/utils';
import { Download, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

interface ImagePreviewProps {
  image?: string | null;
  label?: string;
  className?: string;
  imageClassName?: string;
}

const normalizePreviewSource = (value?: string | null): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') return null;

  if (
    trimmed.startsWith('/') ||
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\//i.test(trimmed) ||
    /^blob:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\/+/, '')}`;
};

export const ImagePreview = ({
  image,
  label,
  className,
  imageClassName,
}: ImagePreviewProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const t = useTranslations('imagePreview');
  const imageSrc = normalizePreviewSource(image);
  const isPdf = Boolean(imageSrc && /\.pdf($|\?)/i.test(imageSrc));

  const handlePreviewClick = () => {
    if (!imageSrc) return;
    if (isPdf) {
      window.open(imageSrc, '_blank', 'noreferrer');
    } else {
      setPreviewImage(imageSrc);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-base font-medium text-slate-600">{label}</p>}
      {imageSrc ? (
        <button
          type="button"
          onClick={handlePreviewClick}
          className="group relative w-full rounded-lg overflow-hidden bg-card shadow-sm transition-all duration-300 transform hover:scale-[1.02]"
        >
          {isPdf ? (
            <div className="w-full h-[150px] flex flex-col items-center justify-center bg-slate-50 border rounded-lg">
              <FileText className="w-12 h-12 text-rose-500" />
              <p className="mt-2 text-center text-sm font-medium text-slate-700">
                {t('viewPdf')}
              </p>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10" />
            </div>
          ) : (
            <div className="relative w-full">
              <Image
                src={imageSrc}
                alt={label ?? 'image'}
                width={300}
                height={300}
                className={cn('object-cover h-[150px] w-full', imageClassName)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-foreground">
                  {t('viewFull')}
                </span>
              </div>
            </div>
          )}
        </button>
      ) : (
        <div className="flex h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100">
          <FileText className="mb-1 h-8 w-8 text-slate-400" />
          <p className="text-xs text-slate-500">{t('notUploaded')}</p>
        </div>
      )}

      {previewImage && (
        <AppDialog
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={t('documentPreview')}
          size={'4xl'}
          footer={
            <div className="flex items-center justify-between w-full">
              <AppButton
                variant={'secondary'}
                onClick={() => setPreviewImage(null)}
              >
                {t('close')}
              </AppButton>
              <a href={previewImage} download target="_blank">
                <AppButton leftIcon={<Download size={16} />}>
                  {t('download')}
                </AppButton>
              </a>
            </div>
          }
        >
          <div className="flex h-[70vh] w-full items-center justify-center rounded-lg bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="full"
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        </AppDialog>
      )}
    </div>
  );
};
