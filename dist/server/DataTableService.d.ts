import type { DataTableRequest, DataTableResponse } from '../types.js';
export interface DataTableServiceOptions {
    searchable?: string[];
    orderable?: string[];
    baseQuery?: (query: any) => any;
    scopes?: Record<string, (query: any) => any>;
    computedColumns?: Record<string, string>;
}
export declare class DataTableService<T = any> {
    private _model;
    private _searchable;
    private _orderable;
    private _baseQueryFn;
    private _scopes;
    private _computedColumns;
    private _activeScopes;
    constructor(model: any, options?: DataTableServiceOptions);
    searchable(columns: string[]): this;
    orderable(columns: string[]): this;
    setBaseQuery(fn: (query: any) => any): this;
    addScope(name: string, fn: (query: any) => any): this;
    applyScope(name: string): this;
    addComputedColumn(name: string, sqlExpr: string): this;
    process(request: DataTableRequest): Promise<DataTableResponse<T>>;
}
