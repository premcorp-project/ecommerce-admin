'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Edit, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useSortableData } from '@/hooks/use-sortable-data';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DeliveryRateForm from '@/components/admin/forms/DeliveryRateForm';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface DeliveryRate {
  _id: string;
  city: string | null;
  estimatedDays: number;
  isActive: boolean;
  weightRanges?: { minWeight: number; maxWeight: number; price: number }[];
}

interface DeliveryRatesResponse {
  success: boolean;
  rates: DeliveryRate[];
}

interface DeliveryRateListProps {
  canWrite: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function DeliveryRateList({ canWrite }: DeliveryRateListProps) {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  // Sheet state for delivery rate create/edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DeliveryRate | null>(null);
  const [deletingRate, setDeletingRate] = useState<DeliveryRate | null>(null);

  // Fetch delivery rates
  const {
    data: ratesData,
    isLoading: isRatesLoading,
    isError: isRatesError,
    refetch: refetchRates,
  } = useAdminQuery<DeliveryRatesResponse>(
    adminQueryKeys.deliveryRates(),
    '/config/delivery-rates',
  );

  const deliveryRates = (ratesData as DeliveryRatesResponse)?.rates ?? [];

  // Client-side sorting for delivery rates
  const {
    items: sortedRates,
    requestSort,
    sortConfig,
  } = useSortableData<DeliveryRate>(deliveryRates);

  // Delete delivery rate mutation
  const { mutateAsync: deleteRate, isPending: isDeleting } = useAdminMutation<
    { success: boolean },
    string
  >('delete', (rateId) => `/config/delivery-rates/${rateId}`, {
    onSuccess: () => {
      toast.success(t('toast.rateDeleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-rates'] });
    },
    onError: () => {
      toast.error(t('toast.rateDeleteFailed'));
    },
  });

  // --- Handlers ---

  const handleDeleteRate = async () => {
    if (!deletingRate) return;
    await deleteRate(deletingRate._id);
    setDeletingRate(null);
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setSheetOpen(true);
  };

  const handleEditRate = (rate: DeliveryRate) => {
    setEditingRate(rate);
    setSheetOpen(true);
  };

  const handleCloneRate = (rate: DeliveryRate) => {
    // Create a clone with a modified city name — pass null as item so form is in create mode
    const clonedRate = {
      ...rate,
      _id: null as unknown as string, // Force create mode in the form
      city: `${rate.city ?? 'new'}-copy`,
    };
    setEditingRate(clonedRate as unknown as DeliveryRate | null);
    setSheetOpen(true);
  };

  const columnCount = canWrite ? 5 : 4;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('deliveryRates')}</h2>
        {canWrite && (
          <AppButton onClick={handleCreateRate} leftIcon={<Plus size={18} />}>
            {t('addRate')}
          </AppButton>
        )}
      </div>

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('columns.city')}
                sortKey="city"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.deliveryType')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.estimatedDays')}
                sortKey="estimatedDays"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.status')}
                sortKey="isActive"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              {canWrite && (
                <TableHeaderCell
                  label={t('columns.actions')}
                  sortKey=""
                  requestSort={() => {}}
                  sortConfig={null}
                />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isRatesLoading ? (
              <TableShimmer limit={DEFAULT_LIMIT} columns={columnCount} />
            ) : isRatesError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('failedToLoadRates')}
                    </p>
                    <button
                      onClick={() => refetchRates()}
                      className="text-sm text-primary underline"
                    >
                      {tCommon('retry')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center">
                  <NoDataFound title={t('noRates')} />
                </TableCell>
              </TableRow>
            ) : (
              sortedRates.map((rate) => (
                <TableRow key={rate._id} className="h-[55px]">
                  <TableCell className="pl-4 font-medium">
                    {rate.city ?? t('defaultCity')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rate.weightRanges && rate.weightRanges.length > 0
                      ? `${rate.weightRanges.length} ${t('weightRanges')}`
                      : t('flatRate')}
                  </TableCell>
                  <TableCell>
                    {rate.estimatedDays} {t('days')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rate.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {rate.isActive
                        ? t('statuses.active')
                        : t('statuses.inactive')}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCloneRate(rate)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`Clone ${rate.city ?? t('defaultCity')}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRate(rate)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`${tCommon('edit')} ${rate.city ?? t('defaultCity')}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRate(rate)}
                          disabled={
                            isDeleting && deletingRate?._id === rate._id
                          }
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label={`${tCommon('delete')} ${rate.city ?? t('defaultCity')}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      {deletingRate && (
        <AppAlertDialog
          open={!!deletingRate}
          onOpenChange={(open) => !open && setDeletingRate(null)}
          title={t('deleteRate')}
          subTitle={t('deleteRateConfirm', {
            city: deletingRate.city ?? t('defaultCity'),
          })}
          description={t('deleteRateDescription')}
          variant="delete"
          confirmLabel={t('deleteRate')}
          onConfirm={handleDeleteRate}
          loading={isDeleting}
        />
      )}

      {/* Create/Edit Delivery Rate Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingRate ? t('editRate') : t('createRate')}
            </SheetTitle>
            <SheetDescription>
              {editingRate
                ? t('editRateDescription')
                : t('createRateDescription')}
            </SheetDescription>
          </SheetHeader>
          <DeliveryRateForm
            item={editingRate}
            onSuccess={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </section>
  );
}
