import type { ColumnDef } from '../types.js';

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function generateCSV<T>(data: T[], columns: ColumnDef<T>[]): string {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const header = visibleCols.map((c) => escapeCSV(c.header)).join(',');
  const rows = data.map((row: any) =>
    visibleCols.map((col) => escapeCSV(row[col.key])).join(',')
  );
  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

export function downloadCSV(content: string, filename: string = 'export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
