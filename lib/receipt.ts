import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { AdminOrderDetail } from '@/components/admin/orders/OrderDetail';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptMeta {
    businessName: string;
    businessEmail?: string;
    businessPhone?: string;
    businessAddress?: string;
    businessWebsite?: string;
    currency: string;
    logoBase64?: string; // data:image/png;base64,...
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

const fmtAddr = (a: AdminOrderDetail['deliveryAddress'] | null | undefined): string => {
    if (!a) return '';
    return [a.fullName, a.line1, a.line2, a.city, a.postcode, a.country]
        .filter((v) => v && v !== 'string')
        .join(', ');
};

// ─── Brand ────────────────────────────────────────────────────────────────────

const B = {
    primary: [29, 78, 216] as [number, number, number],       // blue-700
    primaryLight: [219, 234, 254] as [number, number, number], // blue-100
    accent: [245, 158, 11] as [number, number, number],        // amber-500
    dark: [17, 24, 39] as [number, number, number],            // gray-900
    mid: [75, 85, 99] as [number, number, number],             // gray-600
    light: [156, 163, 175] as [number, number, number],        // gray-400
    bg: [249, 250, 251] as [number, number, number],           // gray-50
    white: [255, 255, 255] as [number, number, number],
    green: [5, 150, 105] as [number, number, number],
    greenLight: [209, 250, 229] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
};

// ─── PDF Receipt ──────────────────────────────────────────────────────────────

export const downloadReceiptPdf = async (order: AdminOrderDetail, meta: ReceiptMeta) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210; // A4 width mm
    const margin = 14;
    const contentW = W - margin * 2;
    let y = 0;

    // ── Header band ─────────────────────────────────────────────────────────────
    doc.setFillColor(...B.primary);
    doc.rect(0, 0, W, 38, 'F');

    // Accent stripe
    doc.setFillColor(...B.accent);
    doc.rect(0, 38, W, 2.5, 'F');

    // Logo or business name
    if (meta.logoBase64) {
        try {
            doc.addImage(meta.logoBase64, 'PNG', margin, 7, 40, 22);
        } catch {
            doc.setTextColor(...B.white);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(meta.businessName, margin, 22);
        }
    } else {
        doc.setTextColor(...B.white);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(meta.businessName, margin, 22);
    }

    // "ORDER RECEIPT" label on right
    doc.setTextColor(...B.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ORDER RECEIPT', W - margin, 14, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(order.orderId, W - margin, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(order.createdAt), W - margin, 29, { align: 'right' });

    y = 48;

    // ── Two-column info block ────────────────────────────────────────────────────
    const colW = (contentW - 8) / 2;

    // Left: Bill To
    doc.setFillColor(...B.bg);
    doc.roundedRect(margin, y, colW, 38, 2, 2, 'F');
    doc.setTextColor(...B.primary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin + 4, y + 7);
    doc.setTextColor(...B.dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const customerName = order.user?.name ?? order.guestName ?? order.guestEmail ?? 'Guest';
    const customerEmail = order.user?.email ?? order.guestEmail ?? '';
    doc.text(customerName, margin + 4, y + 14);
    if (customerEmail) doc.text(customerEmail, margin + 4, y + 20);
    if (order.deliveryAddress?.phone && order.deliveryAddress.phone !== 'string') {
        doc.text(order.deliveryAddress.phone, margin + 4, y + 26);
    } else if (order.guestPhone) {
        doc.text(order.guestPhone, margin + 4, y + 26);
    }

    // Right: Ship To / Pickup
    const rx = margin + colW + 8;
    doc.setFillColor(...B.bg);
    doc.roundedRect(rx, y, colW, 38, 2, 2, 'F');
    doc.setTextColor(...B.primary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(order.deliveryMethod === 'pickup' ? 'COLLECTION' : 'SHIP TO', rx + 4, y + 7);
    doc.setTextColor(...B.mid);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    if (order.deliveryMethod === 'pickup') {
        doc.text('Customer will collect from store', rx + 4, y + 14);
    } else {
        const addrLines = [
            order.deliveryAddress?.line1,
            order.deliveryAddress?.line2 !== 'string' ? order.deliveryAddress?.line2 : null,
            order.deliveryAddress?.city,
            order.deliveryAddress?.postcode,
            order.deliveryAddress?.country,
        ].filter(Boolean) as string[];
        addrLines.forEach((line, i) => doc.text(line, rx + 4, y + 14 + i * 5.5));
    }

    y += 46;

    // ── Order meta row ───────────────────────────────────────────────────────────
    const metaItems = [
        { label: 'Order Date', value: fmtDate(order.createdAt) },
        { label: 'Payment', value: order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'cop' ? 'Cash on Pickup' : 'Stripe' },
        { label: 'Status', value: order.status.charAt(0).toUpperCase() + order.status.slice(1) },
        { label: 'Payment Status', value: order.paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    ];
    const metaColW = contentW / metaItems.length;
    metaItems.forEach((item, i) => {
        const mx = margin + i * metaColW;
        doc.setFillColor(...(i % 2 === 0 ? B.primaryLight : B.white));
        doc.rect(mx, y, metaColW, 14, 'F');
        doc.setTextColor(...B.primary);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(item.label.toUpperCase(), mx + 3, y + 5.5);
        doc.setTextColor(...B.dark);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, mx + 3, y + 11.5);
    });

    y += 20;

    // ── Items table ──────────────────────────────────────────────────────────────
    const tableBody = order.items.map((item) => {
        const variant = item.variantAttributes?.length
            ? item.variantAttributes.map((a) => `${a.key}: ${a.value}`).join(', ')
            : '';
        const label = variant ? `${item.name}\n${variant}` : item.name;
        const sku = item.variantSku ? `SKU: ${item.variantSku}` : '';
        return [
            label + (sku ? `\n${sku}` : ''),
            String(item.quantity),
            fmt(item.price, meta.currency),
            fmt(item.price * item.quantity, meta.currency),
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['PRODUCT', 'QTY', 'UNIT PRICE', 'TOTAL']],
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            textColor: B.dark,
            lineColor: [229, 231, 235],
            lineWidth: 0.3,
        },
        headStyles: {
            fillColor: B.primary,
            textColor: B.white,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: B.bg },
        didDrawPage: () => { },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // ── Totals block ─────────────────────────────────────────────────────────────
    const totalsX = W - margin - 72;
    const totalsW = 72;

    const totalsRows: [string, string, boolean][] = [
        ['Subtotal', fmt(order.subtotal, meta.currency), false],
        ...(order.discount > 0 ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `−${fmt(order.discount, meta.currency)}`, false] as [string, string, boolean]] : []),
        [`Tax (${order.taxRate}%)`, fmt(order.taxAmount, meta.currency), false],
        ['Delivery Fee', fmt(order.deliveryFee, meta.currency), false],
    ];

    totalsRows.forEach(([label, value], i) => {
        const ty = y + i * 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...B.mid);
        doc.text(label, totalsX, ty);
        doc.setTextColor(...B.dark);
        doc.text(value, totalsX + totalsW, ty, { align: 'right' });
    });

    y += totalsRows.length * 8 + 2;

    // Total line
    doc.setFillColor(...B.primary);
    doc.rect(totalsX - 2, y, totalsW + 2, 12, 'F');
    doc.setTextColor(...B.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', totalsX + 2, y + 8);
    doc.text(fmt(order.total, meta.currency), totalsX + totalsW - 2, y + 8, { align: 'right' });

    y += 20;

    // ── Delivery notes ───────────────────────────────────────────────────────────
    if (order.deliveryNotes && order.deliveryNotes !== 'string') {
        doc.setFillColor(...B.bg);
        doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
        doc.setTextColor(...B.primary);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DELIVERY NOTES', margin + 4, y + 6);
        doc.setTextColor(...B.mid);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text(`"${order.deliveryNotes}"`, margin + 4, y + 12);
        y += 20;
    }

    // ── Footer ───────────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...B.primary);
    doc.rect(0, pageH - 22, W, 22, 'F');
    doc.setFillColor(...B.accent);
    doc.rect(0, pageH - 22, W, 2, 'F');

    doc.setTextColor(...B.white);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    const footerParts = [
        meta.businessName,
        meta.businessEmail,
        meta.businessPhone,
        meta.businessWebsite,
    ].filter(Boolean).join('  ·  ');

    doc.text(footerParts, W / 2, pageH - 12, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(...B.light);
    doc.text(`Thank you for your order! · Generated ${new Date().toLocaleDateString('en-GB')}`, W / 2, pageH - 6, { align: 'center' });

    doc.save(`receipt_${order.orderId}.pdf`);
};

// ─── Excel Receipt ────────────────────────────────────────────────────────────

export const downloadReceiptExcel = async (order: AdminOrderDetail, meta: ReceiptMeta) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = meta.businessName;
    wb.created = new Date();

    const ws = wb.addWorksheet('Receipt', {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    });

    // Fixed column widths — receipt is 2 cols: label | value
    ws.columns = [
        { width: 28 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
    ];

    const W = 5; // total columns used

    const fill = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } });
    const f = (opts: { bold?: boolean; size?: number; color?: string; italic?: boolean }): Partial<ExcelJS.Font> => ({
        name: 'Calibri', bold: opts.bold, size: opts.size ?? 11,
        color: { argb: `FF${opts.color ?? '111827'}` }, italic: opts.italic,
    });
    const al = (h: ExcelJS.Alignment['horizontal'], v: ExcelJS.Alignment['vertical'] = 'middle'): Partial<ExcelJS.Alignment> =>
        ({ horizontal: h, vertical: v });

    const merge = (r1: number, c1: number, r2: number, c2: number) =>
        ws.mergeCells(r1, c1, r2, c2);

    const addBlank = (h = 8) => { const r = ws.addRow([]); r.height = h; };

    // ── Header band ──────────────────────────────────────────────────────────────
    const hdr = ws.addRow([meta.businessName, '', '', 'ORDER RECEIPT', '']);
    hdr.height = 50;
    merge(1, 1, 1, 3);
    merge(1, 4, 1, 5);
    hdr.getCell(1).font = f({ bold: true, size: 20, color: 'FFFFFF' });
    hdr.getCell(1).fill = fill('1D4ED8');
    hdr.getCell(1).alignment = al('left');
    hdr.getCell(4).font = f({ bold: true, size: 13, color: 'FFFFFF' });
    hdr.getCell(4).fill = fill('1D4ED8');
    hdr.getCell(4).alignment = al('right');
    // Fill remaining cells
    [2, 3, 5].forEach(c => { hdr.getCell(c).fill = fill('1D4ED8'); });

    // Accent stripe
    const accent = ws.addRow([]);
    accent.height = 4;
    for (let c = 1; c <= W; c++) accent.getCell(c).fill = fill('F59E0B');

    addBlank(6);

    // ── Order ID + date ──────────────────────────────────────────────────────────
    const idRow = ws.addRow([order.orderId, '', '', fmtDate(order.createdAt), '']);
    idRow.height = 22;
    merge(4, 1, 4, 3);
    merge(4, 4, 4, 5);
    idRow.getCell(1).font = f({ bold: true, size: 14, color: '1D4ED8' });
    idRow.getCell(4).font = f({ size: 10, color: '6B7280' });
    idRow.getCell(4).alignment = al('right');

    addBlank(6);

    // ── Customer + address ───────────────────────────────────────────────────────
    const customerName = order.user?.name ?? order.guestName ?? order.guestEmail ?? 'Guest';
    const customerEmail = order.user?.email ?? order.guestEmail ?? '';

    const billHdr = ws.addRow(['BILL TO', '', '', order.deliveryMethod === 'pickup' ? 'COLLECTION' : 'SHIP TO', '']);
    billHdr.height = 16;
    merge(6, 1, 6, 3); merge(6, 4, 6, 5);
    [1, 4].forEach(c => {
        billHdr.getCell(c).font = f({ bold: true, size: 8, color: '1D4ED8' });
        billHdr.getCell(c).fill = fill('DBEAFE');
        billHdr.getCell(c).alignment = al(c === 1 ? 'left' : 'right');
    });
    [2, 3, 5].forEach(c => billHdr.getCell(c).fill = fill('DBEAFE'));

    const addrLines = order.deliveryMethod === 'pickup'
        ? ['Customer will collect from store']
        : [
            order.deliveryAddress?.line1,
            order.deliveryAddress?.line2 !== 'string' ? order.deliveryAddress?.line2 : null,
            order.deliveryAddress?.city,
            order.deliveryAddress?.postcode,
            order.deliveryAddress?.country,
        ].filter(Boolean) as string[];

    const maxLines = Math.max(3, addrLines.length);
    const phone = order.deliveryAddress?.phone !== 'string' ? order.deliveryAddress?.phone ?? '' : '';
    const billLines = [customerName, customerEmail, phone || order.guestPhone || ''];

    for (let i = 0; i < maxLines; i++) {
        const r = ws.addRow([billLines[i] ?? '', '', '', addrLines[i] ?? '', '']);
        r.height = 16;
        merge(7 + i, 1, 7 + i, 3);
        merge(7 + i, 4, 7 + i, 5);
        r.getCell(1).font = f({ bold: i === 0, size: 10, color: i === 0 ? '111827' : '6B7280' });
        r.getCell(4).font = f({ size: 9, color: '6B7280' });
        r.getCell(4).alignment = al('right');
    }

    const afterAddr = 7 + maxLines;
    addBlank(8);

    // ── Status row ───────────────────────────────────────────────────────────────
    const statusRow = ws.addRow([
        'Payment Method', order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'cop' ? 'Cash on Pickup' : 'Stripe',
        '',
        'Status', order.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    ]);
    statusRow.height = 18;
    statusRow.getCell(1).font = f({ bold: true, size: 9, color: '6B7280' });
    statusRow.getCell(2).font = f({ bold: true, size: 10 });
    statusRow.getCell(4).font = f({ bold: true, size: 9, color: '6B7280' });
    statusRow.getCell(5).font = f({ bold: true, size: 10, color: '059669' });
    statusRow.getCell(5).alignment = al('right');

    addBlank(10);

    // ── Items table header ───────────────────────────────────────────────────────
    const itemsHdr = ws.addRow(['PRODUCT', 'QTY', 'UNIT PRICE', 'LINE TOTAL', '']);
    itemsHdr.height = 20;
    itemsHdr.eachCell((cell) => {
        cell.font = f({ bold: true, size: 9, color: 'FFFFFF' });
        cell.fill = fill('1D4ED8');
        cell.alignment = al('center');
        cell.border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
    });
    itemsHdr.getCell(1).alignment = al('left');

    // ── Items ────────────────────────────────────────────────────────────────────
    order.items.forEach((item, idx) => {
        const variant = item.variantAttributes?.length
            ? item.variantAttributes.map((a) => `${a.key}: ${a.value}`).join(' · ')
            : '';
        const label = variant ? `${item.name}\n${variant}` : item.name;
        const r = ws.addRow([label, item.quantity, item.price, item.price * item.quantity, '']);
        r.height = variant ? 28 : 20;
        r.getCell(1).font = f({ size: 10 });
        r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        r.getCell(2).font = f({ size: 10 }); r.getCell(2).alignment = al('center');
        r.getCell(3).font = f({ size: 10 }); r.getCell(3).alignment = al('right'); r.getCell(3).numFmt = '#,##0.00';
        r.getCell(4).font = f({ bold: true, size: 10 }); r.getCell(4).alignment = al('right'); r.getCell(4).numFmt = '#,##0.00';
        r.eachCell(cell => {
            cell.fill = fill(idx % 2 === 0 ? 'F9FAFB' : 'FFFFFF');
            cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
        });
    });

    addBlank(6);

    // ── Totals ───────────────────────────────────────────────────────────────────
    const addTotal = (label: string, value: number, bold = false, highlight = false) => {
        const r = ws.addRow(['', '', label, value, '']);
        r.height = 18;
        r.getCell(3).font = f({ bold, size: 10, color: bold ? '1D4ED8' : '6B7280' });
        r.getCell(3).alignment = al('right');
        r.getCell(4).font = f({ bold, size: bold ? 12 : 10, color: bold ? '1D4ED8' : '111827' });
        r.getCell(4).alignment = al('right');
        r.getCell(4).numFmt = '#,##0.00';
        if (highlight) {
            [3, 4].forEach(c => { r.getCell(c).fill = fill('DBEAFE'); });
            r.getCell(3).border = { top: { style: 'medium', color: { argb: 'FF1D4ED8' } } };
            r.getCell(4).border = { top: { style: 'medium', color: { argb: 'FF1D4ED8' } } };
        }
    };

    addTotal('Subtotal', order.subtotal);
    if (order.discount > 0) addTotal(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, -order.discount);
    addTotal(`Tax (${order.taxRate}%)`, order.taxAmount);
    addTotal('Delivery Fee', order.deliveryFee);
    addTotal('TOTAL', order.total, true, true);

    addBlank(12);

    // ── Footer ───────────────────────────────────────────────────────────────────
    const footerRow = ws.addRow([`Thank you for your order, ${customerName}!`, '', '', '', '']);
    footerRow.height = 20;
    merge(footerRow.number, 1, footerRow.number, W);
    footerRow.getCell(1).font = f({ bold: true, size: 11, color: '1D4ED8' });
    footerRow.getCell(1).alignment = al('center');

    const contactRow = ws.addRow([
        [meta.businessName, meta.businessEmail, meta.businessPhone, meta.businessWebsite].filter(Boolean).join('  ·  '),
        '', '', '', '',
    ]);
    contactRow.height = 16;
    merge(contactRow.number, 1, contactRow.number, W);
    contactRow.getCell(1).font = f({ size: 9, color: '9CA3AF', italic: true });
    contactRow.getCell(1).alignment = al('center');

    // Brand footer band
    const brandRow = ws.addRow([]);
    brandRow.height = 6;
    for (let c = 1; c <= W; c++) brandRow.getCell(c).fill = fill('1D4ED8');

    // ── Save ─────────────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `receipt_${order.orderId}.xlsx`);
};
