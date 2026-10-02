'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    FormikContext,
    getIn,
    type FormikContextType,
    type FormikValues,
} from 'formik';
import { Maximize2, PenIcon, UploadCloud, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'react-hot-toast';

interface EditableDocumentFieldProps {
  name: string;
  label: string;
  existingImageUrl?: string | null;
  requiredAsterisk?: boolean;
  maxSizeMB?: number;
  acceptTypes?: string[];
  previewHeight?: number;
}

const DEFAULT_ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const EditableDocumentField: React.FC<EditableDocumentFieldProps> = ({
  name,
  label,
  existingImageUrl,
  requiredAsterisk = false,
  maxSizeMB = 30,
  acceptTypes = DEFAULT_ACCEPT,
  previewHeight = 150,
}) => {
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  if (!formik) {
    throw new Error('EditableDocumentField must be used inside a Formik form');
  }

  const t = useTranslations('appFileInput');
  const inputId = React.useId();
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);
  const [showExisting, setShowExisting] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const fieldError = getIn(formik.errors, name) as string | undefined;
  const fieldTouched = Boolean(getIn(formik.touched, name));
  const showError = Boolean(fieldError) && (fieldTouched || formik.submitCount > 0);

  const currentValue = formik.values?.[name] as File | null | undefined;

  React.useEffect(() => {
    if (currentValue instanceof File) {
      const url = URL.createObjectURL(currentValue);
      setPreviewSrc(url);
      setShowExisting(false);

      return () => {
        URL.revokeObjectURL(url);
      };
    }

    if (!currentValue && existingImageUrl) {
      setPreviewSrc(null);
      setShowExisting(true);
    }
  }, [currentValue, existingImageUrl]);

  const acceptAttr = acceptTypes.join(',');

  const validateFile = (file: File): boolean => {
    if (!acceptTypes.includes(file.type)) {
      toast.error(t('onlyImageFilesAllowed'));
      return false;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(t('fileTooLarge', { maxSize: maxSizeMB }));
      return false;
    }
    return true;
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      formik.setFieldValue(name, null);
      formik.setFieldTouched(name, true, false);
      setPreviewSrc(null);
      setShowExisting(true);
      return;
    }
    if (!validateFile(file)) return;

    formik.setFieldValue(name, file);
    formik.setFieldTouched(name, true, false);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
  };

  const clearFile = () => {
    formik.setFieldValue(name, null);
    setPreviewSrc(null);
    setShowExisting(true);
    setDialogOpen(false);
  };

  const displayImageUrl = showExisting ? existingImageUrl : previewSrc;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[15px] font-medium">
        {label}
        {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
      </label>

      <input
        id={inputId}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={onInputChange}
      />

      {displayImageUrl ? (
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-lg border bg-card',
            showError ? 'border-destructive' : 'border-stroke',
          )}
          style={{ height: previewHeight }}
        >
          {/* Image preview */}
          <button
            type="button"
            className="group absolute inset-0"
            onClick={() => setDialogOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
              <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-xs font-medium shadow text-foreground">
                <Maximize2 className="h-3.5 w-3.5" />
                {t('view')}
              </span>
            </div>
          </button>

          {/* Edit button */}
          <label
            htmlFor={inputId}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow hover:bg-card cursor-pointer"
            title={t('changeDocument')}
          >
            <PenIcon className="h-4 w-4" />
          </label>

          {/* Clear button (only show if new file is selected) */}
          {!showExisting && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearFile();
              }}
              className="absolute right-12 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow hover:bg-card"
              aria-label={t('removeFile')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed p-5 transition',
            'text-sm hover:border-primary',
            showError ? 'border-destructive' : 'border-stroke',
          )}
          style={{ minHeight: previewHeight }}
        >
          <UploadCloud className="mb-2 h-6 w-6" />
          <span className="font-medium">
            {t('dragAndDrop')} <span className="underline">{t('browse')}</span>
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {t('allowed')}:{' '}
            {acceptTypes
              .map((type) => type.split('/')[1].toUpperCase())
              .join(', ')}{' '}
            {t('max')} {maxSizeMB}MB
          </span>
        </label>
      )}

      {showError && (
        <p className="text-sm text-destructive">{fieldError}</p>
      )}

      {/* Full-screen dialog preview */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('fullPreview')}
            </DialogDescription>
          </DialogHeader>

          {displayImageUrl ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl}
                alt={label}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('noPreviewAvailable')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditableDocumentField;
