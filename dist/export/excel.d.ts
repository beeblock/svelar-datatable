import type { ColumnDef } from '../types.js';
export declare function exportExcel<T>(data: T[], columns: ColumnDef<T>[], filename?: string): Promise<void>;
