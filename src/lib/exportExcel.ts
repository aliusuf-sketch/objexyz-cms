import type { Workbook } from 'exceljs';

// Shared tail end of every XLSX export in the app (Orders, Shipping Queue):
// serialize the workbook and trigger a browser download. Callers build the
// worksheet/columns/rows themselves (those differ per page) and just hand
// off the finished workbook here. Type-only import of exceljs so this file
// carries no runtime cost until a caller actually has a Workbook instance.
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
