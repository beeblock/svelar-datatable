import type { ColumnDef, ExportFormat } from '../types.js';
export declare class ExportManager<T = any> {
    export(format: ExportFormat, data: T[], columns: ColumnDef<T>[], filename?: string): Promise<void>;
}
