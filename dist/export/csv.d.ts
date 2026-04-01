import type { ColumnDef } from '../types.js';
export declare function generateCSV<T>(data: T[], columns: ColumnDef<T>[]): string;
export declare function downloadCSV(content: string, filename?: string): void;
export declare function downloadBlob(blob: Blob, filename: string): void;
