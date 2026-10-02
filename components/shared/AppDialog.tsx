'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { AppButton } from './AppButton';

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

const sizeToMaxWidth: Record<Size, string> = {
  sm: '!max-w-sm',
  md: '!max-w-md',
  lg: '!max-w-lg',
  xl: '!max-w-xl',
  '2xl': '!max-w-2xl',
  '3xl': '!max-w-3xl',
  '4xl': '!max-w-4xl',
  '5xl': '!max-w-5xl',
  '6xl': '!max-w-6xl',
  '7xl': '!max-w-7xl',
  full: '!max-w-[95vw]',
};

export interface AppDialogProps {
  open: boolean;
  onClose: () => void;

  /** Header */
  title?: React.ReactNode; // simple string or custom node
  headerRight?: React.ReactNode; // e.g. badge, extra actions
  showCloseButton?: boolean; // default true

  /** Body */
  children?: React.ReactNode; // dialog content
  description?: React.ReactNode;

  /** Footer */
  footer?: React.ReactNode; // fully custom footer

  /** Layout / style */
  size?: Size; // default "2xl"
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showDefaultFooter?: boolean;
}

export function AppDialog({
  open,
  onClose,

  title,
  headerRight,
  showCloseButton = true,

  children,
  description,
  footer,

  size = '2xl',
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  showDefaultFooter = true,
}: AppDialogProps) {
  const t = useTranslations('appDialog');
  const resolvedDescription = description ?? t('defaultDescription');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Only call onClose when the dialog is being closed by Radix (isOpen === false)
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={clsx(
          sizeToMaxWidth[size],
          '!p-0 bg-light shadow-sm !rounded-2xl overflow-clip',
          'mx-auto',
          contentClassName,
        )}
      >
        <DialogHeader
          className={clsx('bg-card shadow-sm py-4 px-6 !m-0', headerClassName)}
        >
          <DialogTitle className="flex items-center justify-between">
            <span className="2xl:text-[22px] sm:text-lg leading-0 text-base font-medium">
              {title}
            </span>

            <div className="flex items-center gap-2">
              {headerRight}
              {showCloseButton && (
                <button
                  className="text-primary hover:text-foreground focus:outline-none cursor-pointer"
                  aria-label={t('closeDialog')}
                  onClick={onClose}
                >
                  <X className="w-7 h-7" />
                </button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {resolvedDescription}
          </DialogDescription>
        </DialogHeader>

        <div className={clsx('!p-0 !m-0 pt-0', bodyClassName)}>
          <div className="max-h-[70vh] overflow-y-auto p-4 pt-5">
            {children}
          </div>

          {footer ? (
            <div
              className={clsx(
                'flex items-center justify-between w-full px-5 pb-4',
                footerClassName,
              )}
            >
              {footer}
            </div>
          ) : showDefaultFooter ? (
            <div className="flex items-center justify-end w-full px-10 py-4">
              <AppButton
                variant="primary"
                className="px-12"
                onClick={() => onClose()}
              >
                {t('close')}
              </AppButton>
            </div>
          ) : (
            ''
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
