import type { ColumnDef } from '../types.js';
export declare function copyToClipboard<T>(data: T[], columns: ColumnDef<T>[]): Promise<void>;
