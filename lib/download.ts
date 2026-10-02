import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadColumn {
  header: string;
  dataKey: string;
  formatter?: (item: Record<string, unknown>) => string;
  width?: number;
}

export interface DownloadMeta {
  title?: string;
  businessName?: string;
  currency?: string;
  logoBase64?: string; // optional — pass if you want logo in the file
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveNestedKey = (obj: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce((acc, part) => acc && (acc as Record<string, unknown>)[part], obj as unknown);

const getCellValue = (item: Record<string, unknown>, col: DownloadColumn): string | number => {
  const raw = col.formatter ? col.formatter(item) : resolveNestedKey(item, col.dataKey);
  const str = raw != null ? String(raw) : '';
  const financialKeys = ['total', 'subtotal', 'discount', 'tax', 'fee', 'count', 'price', 'amount'];
  const isFinancial = financialKeys.some((k) => col.header.toLowerCase().includes(k) || col.dataKey.toLowerCase().includes(k));
  if (isFinancial) {
    const n = parseFloat(str);
    if (!isNaN(n)) return n;
  }
  return str;
};

// ─── Brand colours ────────────────────────────────────────────────────────────

const BRAND = {
  primary: '1D4ED8',       // blue-700
  primaryLight: 'DBEAFE',  // blue-100
  primaryDark: '1E3A8A',   // blue-900
  accent: 'F59E0B',        // amber-500
  white: 'FFFFFF',
  black: '111827',
  grey50: 'F9FAFB',
  grey100: 'F3F4F6',
  grey200: 'E5E7EB',
  grey400: '9CA3AF',
  grey600: '4B5563',
  grey700: '374151',
  green: '059669',
  greenLight: 'D1FAE5',
};

// ─── Style helpers ────────────────────────────────────────────────────────────

function fill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } };
}

function font(opts: { bold?: boolean; size?: number; color?: string; italic?: boolean; name?: string }): Partial<ExcelJS.Font> {
  return {
    name: opts.name ?? 'Calibri',
    bold: opts.bold ?? false,
    size: opts.size ?? 11,
    color: { argb: `FF${opts.color ?? BRAND.black}` },
    italic: opts.italic ?? false,
  };
}

function border(style: ExcelJS.BorderStyle = 'thin', color = BRAND.grey200): Partial<ExcelJS.Borders> {
  const b = { style, color: { argb: `FF${color}` } };
  return { top: b, bottom: b, left: b, right: b };
}

function align(h: ExcelJS.Alignment['horizontal'] = 'left', v: ExcelJS.Alignment['vertical'] = 'middle', wrap = false): Partial<ExcelJS.Alignment> {
  return { horizontal: h, vertical: v, wrapText: wrap };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const downloadExcel = async <T extends Record<string, unknown>>(
  fileName: string,
  columns: DownloadColumn[],
  data: T[],
  meta?: DownloadMeta,
) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OttimoDirect Admin';
  wb.created = new Date();

  const title = meta?.title ?? fileName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const businessName = meta?.businessName ?? 'OttimoDirect';
  const currency = meta?.currency ?? 'GBP';
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const ws = wb.addWorksheet(title.slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 9 }], // freeze above data rows
  });

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = columns.map((col) => ({
    width: col.width ?? Math.min(
      Math.max(
        col.header.length + 4,
        ...data.slice(0, 50).map((item) => {
          const v = getCellValue(item as Record<string, unknown>, col);
          return String(v).length + 2;
        }),
      ),
      45,
    ),
  }));

  const totalCols = columns.length;
  const lastCol = String.fromCharCode(64 + totalCols); // e.g. "T" for 20 cols

  // ── Row 1: Logo area + brand stripe ───────────────────────────────────────
  const logoRow = ws.addRow([]);
  logoRow.height = 60;
  // Fill entire row with brand primary
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(1, c);
    cell.fill = fill(BRAND.primary);
  }

  // Try to embed logo if available
  try {
    const logoRes = await fetch('/images/main-logo.png');
    if (logoRes.ok) {
      const logoBuffer = await logoRes.arrayBuffer();
      const logoId = wb.addImage({ buffer: logoBuffer, extension: 'png' });
      ws.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 160, height: 50 },
        editAs: 'oneCell',
      });
    }
  } catch {
    // Logo not available — show text instead
    const logoCell = ws.getCell(1, 1);
    logoCell.value = businessName;
    logoCell.font = font({ bold: true, size: 20, color: BRAND.white, name: 'Calibri' });
    logoCell.alignment = align('left', 'middle');
  }

  // Business name on the right side of the header bar
  const headerRightCell = ws.getCell(1, totalCols);
  headerRightCell.value = businessName;
  headerRightCell.font = font({ bold: true, size: 14, color: BRAND.white });
  headerRightCell.alignment = align('right', 'middle');

  // ── Row 2: Accent stripe ───────────────────────────────────────────────────
  const accentRow = ws.addRow([]);
  accentRow.height = 6;
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(2, c).fill = fill(BRAND.accent);
  }

  // ── Row 3: Spacer ──────────────────────────────────────────────────────────
  const spacer1 = ws.addRow([]);
  spacer1.height = 8;

  // ── Row 4: Report title ────────────────────────────────────────────────────
  const titleRow = ws.addRow([title]);
  titleRow.height = 28;
  const titleCell = ws.getCell(4, 1);
  titleCell.font = font({ bold: true, size: 18, color: BRAND.primaryDark });
  titleCell.alignment = align('left', 'middle');
  ws.mergeCells(4, 1, 4, Math.min(totalCols, 8));

  // ── Row 5: Meta info ───────────────────────────────────────────────────────
  const metaRow = ws.addRow([
    `Generated: ${generatedAt}`,
    '', '',
    `Records: ${data.length}`,
    '', '',
    `Currency: ${currency}`,
  ]);
  metaRow.height = 18;
  [1, 4, 7].forEach((c) => {
    const cell = ws.getCell(5, c);
    cell.font = font({ size: 10, color: BRAND.grey600, italic: true });
    cell.alignment = align('left', 'middle');
  });

  // ── Row 6: Spacer ──────────────────────────────────────────────────────────
  const spacer2 = ws.addRow([]);
  spacer2.height = 8;

  // ── Row 7: Divider line ────────────────────────────────────────────────────
  const dividerRow = ws.addRow([]);
  dividerRow.height = 3;
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(7, c).fill = fill(BRAND.grey200);
  }

  // ── Row 8: Spacer ──────────────────────────────────────────────────────────
  const spacer3 = ws.addRow([]);
  spacer3.height = 6;

  // ── Row 9: Column headers ──────────────────────────────────────────────────
  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.height = 24;
  headerRow.eachCell((cell, colNum) => {
    cell.value = columns[colNum - 1].header;
    cell.font = font({ bold: true, size: 11, color: BRAND.white });
    cell.fill = fill(BRAND.primary);
    cell.alignment = align('center', 'middle');
    cell.border = {
      bottom: { style: 'medium', color: { argb: `FF${BRAND.primaryDark}` } },
      right: { style: 'thin', color: { argb: `FF${BRAND.primaryLight}` } },
    };
  });

  // ── Data rows ──────────────────────────────────────────────────────────────
  const DATA_START_ROW = 10;
  data.forEach((item, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    const rowBg = isEven ? BRAND.grey50 : BRAND.white;
    const rowData = columns.map((col) => getCellValue(item as Record<string, unknown>, col));
    const dataRow = ws.addRow(rowData);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = columns[colNum - 1];
      if (!col) return;

      cell.fill = fill(rowBg);
      cell.font = font({ size: 10, color: BRAND.black });
      cell.alignment = align('left', 'middle');
      cell.border = {
        bottom: { style: 'hair', color: { argb: `FF${BRAND.grey200}` } },
        right: { style: 'hair', color: { argb: `FF${BRAND.grey200}` } },
      };

      // Right-align numbers
      if (typeof cell.value === 'number') {
        cell.alignment = align('right', 'middle');
        // Format financial columns with 2 decimal places
        const isFinancial = ['total', 'subtotal', 'discount', 'tax', 'fee', 'price', 'amount']
          .some((k) => col.header.toLowerCase().includes(k) || col.dataKey.toLowerCase().includes(k));
        if (isFinancial) cell.numFmt = '#,##0.00';
      }

      // Status colour coding
      const statusVal = String(cell.value ?? '').toLowerCase();
      if (col.dataKey === 'status' || col.header.toLowerCase() === 'status') {
        const statusColors: Record<string, [string, string]> = {
          delivered: [BRAND.greenLight, BRAND.green],
          shipped: ['DBEAFE', '1D4ED8'],
          processing: ['EDE9FE', '7C3AED'],
          confirmed: ['DBEAFE', '1E40AF'],
          cancelled: ['FEE2E2', 'DC2626'],
          pending: ['FEF3C7', 'D97706'],
        };
        const colors = statusColors[statusVal];
        if (colors) {
          cell.fill = fill(colors[0]);
          cell.font = font({ bold: true, size: 10, color: colors[1] });
          cell.alignment = align('center', 'middle');
        }
      }

      // Payment status colour coding
      if (col.dataKey === 'paymentStatus' || col.header.toLowerCase().includes('payment status') || col.header.toLowerCase() === 'payment') {
        const payColors: Record<string, [string, string]> = {
          paid: [BRAND.greenLight, BRAND.green],
          unpaid: ['FEF3C7', 'D97706'],
          failed: ['FEE2E2', 'DC2626'],
          refunded: [BRAND.grey100, BRAND.grey600],
          cod_pending: ['FEF3C7', 'D97706'],
        };
        const colors = payColors[statusVal];
        if (colors) {
          cell.fill = fill(colors[0]);
          cell.font = font({ bold: true, size: 10, color: colors[1] });
          cell.alignment = align('center', 'middle');
        }
      }
    });
  });

  // ── Summary footer ─────────────────────────────────────────────────────────
  const footerData: (string | number)[] = columns.map((col) => {
    const isTotal = col.header.toLowerCase() === 'total' || col.dataKey === 'total';
    if (isTotal) {
      return data.reduce((sum, item) => {
        const v = getCellValue(item as Record<string, unknown>, col);
        return sum + (typeof v === 'number' ? v : 0);
      }, 0);
    }
    return '';
  });
  footerData[0] = `${data.length} record${data.length !== 1 ? 's' : ''}`;

  const footerRow = ws.addRow(footerData);
  footerRow.height = 22;
  footerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.fill = fill(BRAND.primaryLight);
    cell.font = font({ bold: true, size: 10, color: BRAND.primaryDark });
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${BRAND.primary}` } },
    };
    if (typeof cell.value === 'number') {
      cell.alignment = align('right', 'middle');
      cell.numFmt = '#,##0.00';
    }
  });

  // ── Footer branding row ────────────────────────────────────────────────────
  ws.addRow([]);
  const brandFooterRow = ws.addRow([`${businessName} · Exported ${generatedAt}`]);
  brandFooterRow.height = 16;
  const brandCell = ws.getCell(brandFooterRow.number, 1);
  brandCell.font = font({ size: 9, color: BRAND.grey400, italic: true });
  ws.mergeCells(brandFooterRow.number, 1, brandFooterRow.number, totalCols);

  // ── Save ───────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${fileName}_${date}.xlsx`);
};

// ─── Legacy PDF stub ──────────────────────────────────────────────────────────
export const downloadPdf = () => {
  console.warn('PDF export is disabled.');
};
