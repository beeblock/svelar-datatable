import type { ColumnDef } from '../types.js';

export async function copyToClipboard<T>(data: T[], columns: ColumnDef<T>[]): Promise<void> {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const header = visibleCols.map((c) => c.header).join('\t');
  const rows = data.map((row: any) =>
    visibleCols.map((col) => {
      const val = row[col.key];
      return val === null || val === undefined ? '' : String(val);
    }).join('\t')
  );
  const text = [header, ...rows].join('\n');
  await navigator.clipboard.writeText(text);
}
