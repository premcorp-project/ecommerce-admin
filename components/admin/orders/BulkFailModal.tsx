'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// --- Types ---

export type BulkFailReason = 'not_found' | 'already_in_status' | 'duplicate' | 'write_error';

export interface BulkFailEntry {
  orderId: string;
  reason: BulkFailReason;
}

interface BulkFailModalProps {
  open: boolean;
  onClose: () => void;
  failedEntries: BulkFailEntry[];
  status: string;
}

// --- Component ---

export function BulkFailModal({ open, onClose, failedEntries, status }: BulkFailModalProps) {
  const t = useTranslations('admin.orders');

  const reasonLabel = (reason: BulkFailReason): string => {
    const map: Record<BulkFailReason, string> = {
      not_found: t('bulk.failReasons.not_found'),
      already_in_status: t('bulk.failReasons.already_in_status'),
      duplicate: t('bulk.failReasons.duplicate'),
      write_error: t('bulk.failReasons.write_error'),
    };
    return map[reason] ?? reason;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bulk.failModal.title')}</DialogTitle>
          <DialogDescription>
            {t('bulk.failModal.description', { count: failedEntries.length, status })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 max-h-72 overflow-y-auto">
          <div className="space-y-2 pr-1">
            {failedEntries.map((entry) => (
              <div
                key={entry.orderId}
                className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{entry.orderId}</span>
                <span className="text-xs text-muted-foreground">{reasonLabel(entry.reason)}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
