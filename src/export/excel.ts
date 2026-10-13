import type { ColumnDef } from '../types.js';
import { downloadBlob } from './csv.js';

export async function exportExcel<T>(data: T[], columns: ColumnDef<T>[], filename: string = 'export.xlsx') {
  let ExcelJS: any;
  try {
    const module = await import('exceljs');
    ExcelJS = module.default ?? module;
  } catch {
    throw new Error('exceljs is required for Excel export. Install it: npm install exceljs');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  const visibleCols = columns.filter((c) => c.visible !== false);

  // Header row
  worksheet.columns = visibleCols.map((col) => ({
    header: col.header,
    key: col.key,
    width: 20,
  }));

  // Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' },
  };

  // Data rows
  for (const row of data) {
    const rowData: Record<string, any> = {};
    for (const col of visibleCols) {
      rowData[col.key] = (row as any)[col.key] ?? '';
    }
    worksheet.addRow(rowData);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}
