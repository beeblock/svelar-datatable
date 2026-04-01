import type { ColumnDef, ExportFormat } from '../types.js';
import { generateCSV, downloadCSV } from './csv.js';
import { copyToClipboard } from './clipboard.js';
import { printTable } from './print.js';
import { exportExcel } from './excel.js';
import { exportPdf } from './pdf.js';

export class ExportManager<T = any> {
  async export(format: ExportFormat, data: T[], columns: ColumnDef<T>[], filename?: string): Promise<void> {
    switch (format) {
      case 'csv': {
        const csv = generateCSV(data, columns);
        downloadCSV(csv, filename ?? 'export.csv');
        break;
      }
      case 'excel':
        await exportExcel(data, columns, filename ?? 'export.xlsx');
        break;
      case 'pdf':
        exportPdf(data, columns, filename ?? 'export.pdf');
        break;
      case 'clipboard':
        await copyToClipboard(data, columns);
        break;
      case 'print':
        printTable(data, columns);
        break;
    }
  }
}
