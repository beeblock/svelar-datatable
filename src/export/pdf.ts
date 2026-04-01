import type { ColumnDef } from '../types.js';
import { generateCSV } from './csv.js';
import { printTable } from './print.js';

export function exportPdf<T>(data: T[], columns: ColumnDef<T>[], filename: string = 'export.pdf') {
  // Use browser print as fallback (generates PDF via print dialog)
  // For server-side PDF, users should use @beeblock/svelar/pdf directly
  printTable(data, columns, filename.replace('.pdf', ''));
}
