'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  SkipForward,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import adminApi from '@/lib/api/admin-api';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneBulkActionsProps {
  canWrite: boolean;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; reason: string }[];
}

interface ZoneExportRow {
  name: string;
  country: string;
  cities: string[] | { name: string }[];
  weightRanges: { minWeight: number; maxWeight: number; price: number }[];
  estimatedDays: number | null;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
}

// ─── Excel Helpers ────────────────────────────────────────────────────────────

async function exportToExcel(zones: ZoneExportRow[]) {
  const ExcelJS = (await import('exceljs')).default;
  const { saveAs } = await import('file-saver');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Zones');

  ws.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Country', key: 'country', width: 10 },
    { header: 'Cities', key: 'cities', width: 40 },
    { header: 'Weight Ranges', key: 'weightRanges', width: 50 },
    { header: 'Estimated Days', key: 'estimatedDays', width: 15 },
    { header: 'Active', key: 'isActive', width: 10 },
    { header: 'Default', key: 'isDefault', width: 10 },
    { header: 'Priority', key: 'priority', width: 10 },
  ];

  // Style header
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4ED8' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  });

  zones.forEach((zone) => {
    const cities = Array.isArray(zone.cities)
      ? zone.cities.map((c) => (typeof c === 'string' ? c : c.name)).join(', ')
      : '';
    const ranges = (zone.weightRanges ?? [])
      .map((r) => `${r.minWeight}-${r.maxWeight}kg: £${r.price}`)
      .join(' | ');

    ws.addRow({
      name: zone.name,
      country: zone.country,
      cities,
      weightRanges: ranges,
      estimatedDays: zone.estimatedDays ?? '',
      isActive: zone.isActive ? 'Yes' : 'No',
      isDefault: zone.isDefault ? 'Yes' : 'No',
      priority: zone.priority ?? 0,
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date().toISOString().split('T')[0];
  saveAs(blob, `delivery-zones-export-${date}.xlsx`);
}

async function parseExcelFile(file: File): Promise<ZoneExportRow[]> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error('No worksheet found');

  const zones: ZoneExportRow[] = [];
  const headers: string[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) =>
        headers.push(String(cell.value ?? '').toLowerCase()),
      );
      return;
    }

    const getValue = (col: string) => {
      const idx = headers.indexOf(col);
      return idx >= 0 ? row.getCell(idx + 1).value : null;
    };

    const name = String(getValue('name') ?? '').trim();
    if (!name) return; // skip empty rows

    const citiesRaw = String(getValue('cities') ?? '');
    const cities = citiesRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const rangesRaw = String(
      getValue('weight ranges') ?? getValue('weightranges') ?? '',
    );
    const weightRanges = rangesRaw
      .split('|')
      .map((r) => {
        const match = r.match(/([\d.]+)-([\d.]+)kg?:\s*£?([\d.]+)/i);
        if (!match) return null;
        return {
          minWeight: Number(match[1]),
          maxWeight: Number(match[2]),
          price: Number(match[3]),
        };
      })
      .filter(Boolean) as {
      minWeight: number;
      maxWeight: number;
      price: number;
    }[];

    const estDays = getValue('estimated days') ?? getValue('estimateddays');
    const active = String(getValue('active') ?? 'yes').toLowerCase();
    const defaultVal = String(getValue('default') ?? 'no').toLowerCase();

    zones.push({
      name,
      country: String(getValue('country') ?? 'GB')
        .trim()
        .toUpperCase(),
      cities,
      weightRanges,
      estimatedDays: estDays ? Number(estDays) : null,
      isActive: active === 'yes' || active === 'true',
      isDefault: defaultVal === 'yes' || defaultVal === 'true',
      priority: Number(getValue('priority') ?? 0),
    });
  });

  return zones;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZoneBulkActions({ canWrite }: ZoneBulkActionsProps) {
  const t = useTranslations('admin.settings.zoneBulk');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedZones, setParsedZones] = useState<unknown[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { mutateAsync: importZones, isPending: isImporting } = useAdminMutation<
    ImportResult,
    unknown[]
  >('post', '/delivery/zones/bulk-import');

  // ── Export handlers ─────────────────────────────────────────────────────────

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const res = await adminApi.get('/delivery/zones/export');
      const zones =
        (res.data as { data?: { zones?: ZoneExportRow[] } })?.data?.zones ?? [];
      const blob = new Blob([JSON.stringify(zones, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-zones-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('exportSuccess'));
    } catch {
      toast.error(t('exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await adminApi.get('/delivery/zones/export');
      const zones =
        (res.data as { data?: { zones?: ZoneExportRow[] } })?.data?.zones ?? [];
      await exportToExcel(zones);
      toast.success(t('exportSuccess'));
    } catch {
      toast.error(t('exportError'));
    } finally {
      setExporting(false);
    }
  };

  // ── Import handlers ─────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      let parsed: unknown[];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          toast.error(t('invalidFile'));
          return;
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsed = await parseExcelFile(file);
        if (parsed.length === 0) {
          toast.error(t('invalidFile'));
          return;
        }
      } else {
        toast.error(t('invalidFile'));
        return;
      }

      setParsedZones(parsed);
      setConfirmOpen(true);
    } catch {
      toast.error(t('invalidFile'));
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedZones) return;
    setConfirmOpen(false);
    try {
      const result = await importZones(parsedZones);
      const data =
        (result as unknown as { data?: ImportResult })?.data ?? result;
      setResults(data);
      setResultsOpen(true);
      toast.success(t('importSuccess'));
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.deliveryZones(),
      });
    } catch {
      toast.error(t('importError'));
    } finally {
      setParsedZones(null);
    }
  };

  const handleResultsClose = () => {
    setResultsOpen(false);
    setResults(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AppButton
              variant="secondary"
              size="sm"
              isLoading={exporting}
              leftIcon={<Download size={16} />}
            >
              {t('export')}
            </AppButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJSON}>
              <Download className="size-4 mr-2" />
              JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="size-4 mr-2" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import button */}
        {canWrite && (
          <>
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isImporting}
              leftIcon={<Upload size={16} />}
            >
              {t('import')}
            </AppButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}
      </div>

      {/* Import confirmation dialog */}
      {confirmOpen && (
        <AppAlertDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('importTitle')}
          subTitle={t('importConfirm', { count: parsedZones?.length ?? 0 })}
          variant="primary"
          confirmLabel={t('importConfirmBtn')}
          onConfirm={handleConfirmImport}
          loading={isImporting}
        />
      )}

      {/* Results dialog */}
      <Dialog open={resultsOpen} onOpenChange={handleResultsClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('resultsTitle')}</DialogTitle>
          </DialogHeader>
          {results && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 rounded-md bg-green-100 px-3 py-2 dark:bg-green-900/30">
                <CheckCircle2
                  size={16}
                  className="text-green-800 dark:text-green-400"
                />
                <span className="text-sm font-medium text-green-800 dark:text-green-400">
                  {t('resultsCreated')}: {results.created}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-blue-100 px-3 py-2 dark:bg-blue-900/30">
                <RefreshCw
                  size={16}
                  className="text-blue-800 dark:text-blue-400"
                />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                  {t('resultsUpdated')}: {results.updated}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-yellow-100 px-3 py-2 dark:bg-yellow-900/30">
                <SkipForward
                  size={16}
                  className="text-yellow-800 dark:text-yellow-400"
                />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  {t('resultsSkipped')}: {results.skipped}
                </span>
              </div>
              {results.errors.length > 0 && (
                <div className="rounded-md bg-red-100 px-3 py-2 dark:bg-red-900/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      size={16}
                      className="text-red-800 dark:text-red-400"
                    />
                    <span className="text-sm font-medium text-red-800 dark:text-red-400">
                      {t('resultsErrors')}: {results.errors.length}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 text-xs text-red-800 dark:text-red-400 list-disc">
                    {results.errors.map((err) => (
                      <li key={err.index}>
                        {t('resultsErrorItem', {
                          index: err.index,
                          reason: err.reason,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <AppButton onClick={handleResultsClose}>
              {t('resultsDone')}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
