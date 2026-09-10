import type { Workbook } from 'exceljs';

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
  /** exceljs number format, e.g. '#,##0' for money columns. */
  numFmt?: string;
}

export interface XlsxExportOptions {
  sheetName: string;
  filename: string;
  columns: XlsxColumn[];
  rows: Record<string, unknown>[];
  /** Bold rows inserted directly under the header (e.g. per-stage counts). */
  headerRows?: Record<string, unknown>[];
  /** Bold summary row appended after a blank spacer row. */
  totalRow?: Record<string, unknown>;
  /** Wrap cell text — for wide cells holding multi-part strings. */
  wrapText?: boolean;
}

/**
 * One-call XLSX export used by Orders, Shipping Queue and Receivables.
 * Each page previously repeated the same ~20 lines of exceljs setup
 * (new Workbook → addWorksheet → columns → bold header → rows → bold
 * totals → writeBuffer → blob → anchor click). exceljs is imported
 * dynamically so it never lands in a page's initial bundle.
 */
export async function exportRowsToXlsx(opts: XlsxExportOptions): Promise<void> {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  const ws = wb.addWorksheet(opts.sheetName);

  ws.columns = opts.columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  ws.getRow(1).font = { bold: true };

  opts.headerRows?.forEach(r => {
    ws.addRow(r).font = { bold: true, italic: true };
  });

  opts.rows.forEach(r => ws.addRow(r));

  if (opts.totalRow) {
    ws.addRow({});
    ws.addRow(opts.totalRow).font = { bold: true };
  }

  opts.columns.forEach(c => {
    if (c.numFmt) ws.getColumn(c.key).numFmt = c.numFmt;
  });

  if (opts.wrapText) {
    ws.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; });
  }

  await downloadWorkbook(wb, opts.filename);
}

/**
 * Serialize a finished workbook and trigger a browser download. Exposed
 * separately for any caller that needs full control over sheet building.
 */
export async function downloadWorkbook(wb: Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Today as YYYY-MM-DD, for dated export filenames. */
export function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
