'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const sizeToMaxWidth: Record<Size, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
};

interface AppAlertDialogProps {
  trigger?: ReactNode;

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  title: string;
  subTitle: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  size?: Size;
  className?: string;
  confirmButtonClass?: string;
  variant: 'primary' | 'delete';
}

const AppAlertDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  subTitle,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  cancelLabel,
  onCancel,
  loading,
  size = 'xl',
  className,
  confirmButtonClass,
  variant = 'delete',
}: AppAlertDialogProps) => {
  const t = useTranslations('appAlertDialog');
  const resolvedDescription = description || subTitle;

  const handleCancel = () => {
    if (onCancel) return onCancel();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <AlertDialog open={open}>
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : null}

      <AlertDialogContent
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          sizeToMaxWidth[size],
          'bg-background p-0 rounded-lg border border-border',
          className,
        )}
      >
        <AlertDialogDescription className="sr-only">
          {resolvedDescription}
        </AlertDialogDescription>
        <div className="w-full bg-card py-2 px-3 shadow-sm rounded-t-lg flex items-center justify-between border-b border-border">
          <AlertDialogTitle className="w-fit text-foreground">{title}</AlertDialogTitle>
          <AlertDialogCancel
            className="w-fit cursor-pointer text-foreground hover:bg-muted border-0 bg-transparent"
            onClick={handleCancel}
          >
            <X />
          </AlertDialogCancel>
        </div>

        <div className="bg-card rounded-lg p-4 mx-4 border border-border">
          <p className="font-medium text-base text-foreground">{subTitle}</p>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>

        <div className="flex items-center justify-between p-4">
          <AlertDialogCancel
            className="border border-border px-8 py-4 cursor-pointer text-foreground bg-background hover:bg-muted"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel || t('cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            className={cn(
              'px-12 py-5 cursor-pointer',
              variant === 'delete'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              confirmButtonClass,
            )}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? t('processing') : confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { AppAlertDialog };
