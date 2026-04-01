import type { DataTableConfig, FilterState, SortState } from '../types.js';
import { DataTableStore } from './DataTableStore.js';
export declare class ServerDataTableStore<T = any> extends DataTableStore<T> {
    private _serverUrl;
    private _serverMethod;
    private _drawCounter;
    private _abortController;
    private _fetchDebounceTimer;
    private _serverColumns;
    private _csrfCookieName;
    private _csrfHeaderName;
    constructor(config: DataTableConfig<T>);
    private _buildHeaders;
    setSort(sort: SortState[]): void;
    setGlobalSearch(search: string): void;
    setFilters(filters: FilterState[]): void;
    setPage(page: number): void;
    setPerPage(perPage: number): void;
    private _debouncedFetch;
    _fetchFromServer(): Promise<void>;
    initialFetch(): Promise<void>;
    destroy(): void;
}
