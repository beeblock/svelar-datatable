import type { ColumnDef } from '../types.js';

export function printTable<T>(data: T[], columns: ColumnDef<T>[], title?: string) {
  const visibleCols = columns.filter((c) => c.visible !== false);

  const headerCells = visibleCols.map((c) => `<th style="border:1px solid #ddd;padding:8px 12px;text-align:left;background:#f5f5f5;font-weight:600;">${escapeHtml(c.header)}</th>`).join('');
  const bodyRows = data.map((row: any) => {
    const cells = visibleCols.map((col) => {
      const val = row[col.key];
      return `<td style="border:1px solid #ddd;padding:8px 12px;">${escapeHtml(val === null || val === undefined ? '' : String(val))}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<title>${escapeHtml(title ?? 'Data Export')}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  h1 { font-size: 18px; margin-bottom: 16px; }
  @media print { h1 { margin-top: 0; } }
</style>
</head><body>
${title ? `<h1>${escapeHtml(title)}</h1>` : ''}
<table>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
