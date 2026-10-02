'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Edit, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { DeliveryZone, ZonesListResponse } from '@/types/delivery-zones';
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
import ZoneForm from '@/components/admin/forms/ZoneForm';
import ZoneBulkActions from '@/components/admin/settings/ZoneBulkActions';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface DeliveryZoneListProps {
  canWrite: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function DeliveryZoneList({ canWrite }: DeliveryZoneListProps) {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);

  // Fetch delivery zones
  const {
    data: zonesData,
    isLoading,
    isError,
    refetch,
  } = useAdminQuery<ZonesListResponse>(
    adminQueryKeys.deliveryZones(),
    '/delivery/zones/admin/list',
  );

  const zones: DeliveryZone[] = (() => {
    const raw = zonesData as unknown as
      | { data?: ZonesListResponse }
      | ZonesListResponse
      | undefined;
    if (!raw) return [];
    // Handle envelope: { data: { zones: [...] } } or direct { zones: [...] }
    const inner = (raw as { data?: ZonesListResponse }).data ?? raw;
    return (inner as ZonesListResponse)?.zones ?? [];
  })();

  // Client-side sorting
  const {
    items: sortedZones,
    requestSort,
    sortConfig,
  } = useSortableData<DeliveryZone>(zones);

  // Delete zone mutation
  const { mutateAsync: deleteZone, isPending: isDeleting } = useAdminMutation<
    { success: boolean },
    string
  >('delete', (zoneId) => `/delivery/zones/${zoneId}`, {
    onSuccess: () => {
      toast.success(t('zoneToast.deleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-zones'] });
    },
    onError: () => {
      toast.error(t('zoneToast.deleteFailed'));
    },
  });

  // --- Handlers ---

  const handleDelete = async () => {
    if (!deletingZone) return;
    try {
      await deleteZone(deletingZone._id);
      setDeletingZone(null);
    } catch {
      // onError callback shows the toast
    }
  };

  const handleCreate = () => {
    setEditingZone(null);
    setSheetOpen(true);
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setSheetOpen(true);
  };

  const handleClone = (zone: DeliveryZone) => {
    const cloned = {
      ...zone,
      _id: '' as string,
      name: `${zone.name} (copy)`,
      isDefault: false,
    };
    setEditingZone(cloned as unknown as DeliveryZone);
    setSheetOpen(true);
  };

  const columnCount = canWrite ? 9 : 8;

  // ─── Delivery Config (defaultDeliveryFee + deliveryMode) ────────────────────
  interface ConfigResponse {
    data?: { config?: { defaultDeliveryFee?: number; deliveryMode?: string } };
    config?: { defaultDeliveryFee?: number; deliveryMode?: string };
  }
  const { data: configData } = useAdminQuery<ConfigResponse>(
    adminQueryKeys.settings(),
    '/config',
  );
  const cfg = configData?.data?.config ?? configData?.config;
  const currentFee = cfg?.defaultDeliveryFee ?? 0;
  const currentMode = cfg?.deliveryMode ?? 'lenient';

  const [feeValue, setFeeValue] = useState<string>('');
  const [modeValue, setModeValue] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Sync local state when config loads
  const feeDisplay = feeValue || String(currentFee);
  const modeDisplay = modeValue || currentMode;

  const { mutateAsync: updateConfig } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('put', '/config');

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const payload: Record<string, unknown> = {};
      if (feeValue) payload.defaultDeliveryFee = Number(feeValue);
      if (modeValue) payload.deliveryMode = modeValue;
      await updateConfig(payload);
      toast.success(t('zoneToast.updated'));
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings() });
      setFeeValue('');
      setModeValue('');
    } catch {
      toast.error(t('zoneToast.saveFailed'));
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Delivery Config */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          {t('deliveryConfig')}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="defaultDeliveryFee"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('form.defaultDeliveryFee')}
            </label>
            <input
              id="defaultDeliveryFee"
              type="number"
              min={0}
              step={0.01}
              value={feeDisplay}
              onChange={(e) => setFeeValue(e.target.value)}
              disabled={!canWrite}
              placeholder="4.99"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              {t('form.defaultDeliveryFeeHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="deliveryMode"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('deliveryModeLabel')}
            </label>
            <select
              id="deliveryMode"
              value={modeDisplay}
              onChange={(e) => setModeValue(e.target.value)}
              disabled={!canWrite}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="lenient">{t('deliveryModeLenient')}</option>
              <option value="strict">{t('deliveryModeStrict')}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {t('deliveryModeHint')}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex justify-end pt-2">
            <AppButton
              onClick={handleSaveConfig}
              isLoading={savingConfig}
              variant="secondary"
            >
              {tCommon('save')}
            </AppButton>
          </div>
        )}
      </div>

      {/* Instructions */}
      <details className="rounded-lg border border-border bg-muted/30 group">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-foreground select-none hover:bg-muted/50 transition-colors">
          <HelpCircle className="size-4 text-muted-foreground shrink-0" />
          {t('zoneInstructions.title')}
        </summary>
        <div className="border-t border-border px-4 py-4 space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('zoneInstructions.howItWorks')}
            </p>
            <p>{t('zoneInstructions.howItWorksDesc')}</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('zoneInstructions.creatingZone')}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('zoneInstructions.step1')}</li>
              <li>{t('zoneInstructions.step2')}</li>
              <li>{t('zoneInstructions.step3')}</li>
              <li>{t('zoneInstructions.step4')}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('zoneInstructions.weightRangeRules')}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('zoneInstructions.rule1')}</li>
              <li>{t('zoneInstructions.rule2')}</li>
              <li>{t('zoneInstructions.rule3')}</li>
              <li>{t('zoneInstructions.rule4')}</li>
              <li>{t('zoneInstructions.rule5')}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('zoneInstructions.importExport')}
            </p>
            <p>{t('zoneInstructions.importExportDesc')}</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('zoneInstructions.tips')}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('zoneInstructions.tip1')}</li>
              <li>{t('zoneInstructions.tip2')}</li>
              <li>{t('zoneInstructions.tip3')}</li>
              <li>{t('zoneInstructions.tip4')}</li>
              <li>{t('zoneInstructions.tip5')}</li>
              <li>{t('zoneInstructions.tip6')}</li>
              <li>{t('zoneInstructions.tip7')}</li>
            </ul>
          </div>
        </div>
      </details>

      {/* Zone List */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('deliveryZones')}</h2>
        <div className="flex items-center gap-2">
          <ZoneBulkActions canWrite={canWrite} />
          {canWrite && (
            <AppButton onClick={handleCreate} leftIcon={<Plus size={18} />}>
              {t('addZone')}
            </AppButton>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('zoneColumns.name')}
                sortKey="name"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('zoneColumns.country')}
                sortKey="country"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('zoneColumns.cities')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('zoneColumns.weightRanges')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('zoneColumns.estimatedDays')}
                sortKey="estimatedDays"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('zoneColumns.status')}
                sortKey="isActive"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('zoneColumns.default')}
                sortKey="isDefault"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('zoneColumns.priority')}
                sortKey="priority"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              {canWrite && (
                <TableHeaderCell
                  label={t('zoneColumns.actions')}
                  sortKey=""
                  requestSort={() => {}}
                  sortConfig={null}
                />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableShimmer limit={DEFAULT_LIMIT} columns={columnCount} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('failedToLoadRates')}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="text-sm text-primary underline"
                    >
                      {tCommon('retry')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedZones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center">
                  <NoDataFound title={t('noZones')} />
                </TableCell>
              </TableRow>
            ) : (
              sortedZones.map((zone) => (
                <TableRow key={zone._id} className="h-[55px]">
                  <TableCell className="pl-4 font-medium">
                    {zone.name}
                  </TableCell>
                  <TableCell>{zone.country}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {zone.cities.length > 0
                      ? zone.cities.map((c) => c.name).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell>{zone.weightRanges.length}</TableCell>
                  <TableCell>
                    {zone.estimatedDays
                      ? `${zone.estimatedDays} ${t('days')}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        zone.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {zone.isActive
                        ? t('statuses.active')
                        : t('statuses.inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {zone.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 text-xs font-medium">
                        {t('zoneColumns.default')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{zone.priority}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleClone(zone)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`Clone ${zone.name}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(zone)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`${tCommon('edit')} ${zone.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingZone(zone)}
                          disabled={
                            isDeleting && deletingZone?._id === zone._id
                          }
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          aria-label={`${tCommon('delete')} ${zone.name}`}
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

      {/* Delete confirmation */}
      {deletingZone && (
        <AppAlertDialog
          open={!!deletingZone}
          onOpenChange={(open) => !open && setDeletingZone(null)}
          title={t('deleteZone')}
          subTitle={t('deleteZoneConfirm', { name: deletingZone.name })}
          description={t('deleteZoneDescription')}
          variant="delete"
          confirmLabel={t('deleteZone')}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}

      {/* Create/Edit Zone Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingZone?._id ? t('editZone') : t('createZone')}
            </SheetTitle>
            <SheetDescription>
              {editingZone?._id
                ? t('editZoneDescription')
                : t('createZoneDescription')}
            </SheetDescription>
          </SheetHeader>
          <ZoneForm item={editingZone} onSuccess={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </section>
  );
}
