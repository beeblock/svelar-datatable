import type { DataTableRequest, DataTableResponse } from '../types.js';
import { Connection } from '@beeblock/svelar/database';

export type DataTableServerFilterHandler = (
  query: any,
  value: any,
  context: { request: DataTableRequest; filter: string }
) => any | void;

export interface DataTableServiceOptions {
  searchable?: string[];
  orderable?: string[];
  baseQuery?: (query: any) => any;
  scopes?: Record<string, (query: any) => any>;
  computedColumns?: Record<string, string>;
  filters?: Record<string, DataTableServerFilterHandler>;
  searchDriver?: 'database' | 'meilisearch' | 'auto';
  meilisearchFilter?: (
    filters: Record<string, any>,
    request: DataTableRequest
  ) => string | string[] | undefined;
  meilisearchSort?: (request: DataTableRequest) => string[] | undefined;
}

export class DataTableService<T = any> {
  private _model: any;
  private _searchable: string[] = [];
  private _orderable: string[] = [];
  private _baseQueryFn: ((query: any) => any) | null = null;
  private _scopes: Record<string, (query: any) => any> = {};
  private _computedColumns: Record<string, string> = {};
  private _activeScopes: string[] = [];
  private _filters: Record<string, DataTableServerFilterHandler> = {};
  private _activeFilters: Record<string, any> = {};
  private _searchDriver: 'database' | 'meilisearch' | 'auto' = 'auto';
  private _meilisearchFilter?: DataTableServiceOptions['meilisearchFilter'];
  private _meilisearchSort?: DataTableServiceOptions['meilisearchSort'];

  constructor(model: any, options?: DataTableServiceOptions) {
    this._model = model;
    if (options?.searchable) this._searchable = options.searchable;
    if (options?.orderable) this._orderable = options.orderable;
    if (options?.baseQuery) this._baseQueryFn = options.baseQuery;
    if (options?.scopes) this._scopes = options.scopes;
    if (options?.computedColumns) this._computedColumns = options.computedColumns;
    if (options?.filters) this._filters = options.filters;
    if (options?.searchDriver) this._searchDriver = options.searchDriver;
    if (options?.meilisearchFilter) this._meilisearchFilter = options.meilisearchFilter;
    if (options?.meilisearchSort) this._meilisearchSort = options.meilisearchSort;
  }

  searchable(columns: string[]): this {
    this._searchable = columns;
    return this;
  }

  orderable(columns: string[]): this {
    this._orderable = columns;
    return this;
  }

  setBaseQuery(fn: (query: any) => any): this {
    this._baseQueryFn = fn;
    return this;
  }

  addScope(name: string, fn: (query: any) => any): this {
    this._scopes[name] = fn;
    return this;
  }

  applyScope(name: string): this {
    this._activeScopes.push(name);
    return this;
  }

  addComputedColumn(name: string, sqlExpr: string): this {
    this._computedColumns[name] = sqlExpr;
    return this;
  }

  addFilter(name: string, fn: DataTableServerFilterHandler): this {
    this._filters[name] = fn;
    return this;
  }

  applyFilter(name: string, value: any): this {
    if (value !== undefined && value !== null && value !== '') {
      this._activeFilters[name] = value;
    }
    return this;
  }

  applyFilters(filters: Record<string, any> = {}): this {
    for (const [name, value] of Object.entries(filters)) {
      this.applyFilter(name, value);
    }
    return this;
  }

  private searchOperator(): 'LIKE' | 'ILIKE' {
    try {
      return Connection.getDriver(this._model.connection) === 'postgres' ? 'ILIKE' : 'LIKE';
    } catch {
      return 'LIKE';
    }
  }

  private shouldUseMeilisearch(request: DataTableRequest): boolean {
    if (!request.search.value) return false;
    if (this._searchDriver === 'database') return false;
    return typeof this._model.search === 'function';
  }

  private sortableColumns(request: DataTableRequest): string[] {
    return this._orderable.length > 0
      ? this._orderable
      : request.columns.filter((c) => c.orderable).map((c) => c.data);
  }

  private meilisearchSort(request: DataTableRequest): string[] | undefined {
    const custom = this._meilisearchSort?.(request);
    if (custom) return custom;

    const orderableList = this.sortableColumns(request);
    const sort = request.order
      .map((order) => {
        const col = request.columns[order.column];
        if (!col || !orderableList.includes(col.data)) return null;
        return `${col.data}:${order.dir}`;
      })
      .filter(Boolean) as string[];

    return sort.length > 0 ? sort : undefined;
  }

  private async processWithMeilisearch(
    request: DataTableRequest,
    recordsTotal: number,
    filters: Record<string, any>
  ): Promise<DataTableResponse<T>> {
    const searchOptions: any = {
      limit: request.length,
      offset: request.start,
    };

    const filter = this._meilisearchFilter?.(filters, request);
    if (filter) searchOptions.filter = filter;

    const sort = this.meilisearchSort(request);
    if (sort) searchOptions.sort = sort;

    const results = await this._model.search(request.search.value, searchOptions);

    return {
      draw: request.draw,
      recordsTotal,
      recordsFiltered: results.estimatedTotalHits ?? results.hits.length,
      data: results.hits,
    };
  }

  async process(request: DataTableRequest): Promise<DataTableResponse<T>> {
    try {
      // Get total count (unfiltered)
      const totalQuery = this._model.query();
      if (this._baseQueryFn) this._baseQueryFn(totalQuery);
      const recordsTotal = await totalQuery.count();
      const customFilters = { ...request.customFilters, ...this._activeFilters };

      if (this.shouldUseMeilisearch(request)) {
        try {
          return await this.processWithMeilisearch(request, recordsTotal, customFilters);
        } catch (err) {
          if (this._searchDriver === 'meilisearch') throw err;
        }
      }

      // Build filtered query
      let query = this._model.query();
      if (this._baseQueryFn) this._baseQueryFn(query);

      // Apply active scopes
      for (const scopeName of this._activeScopes) {
        const scopeFn = this._scopes[scopeName];
        if (scopeFn) scopeFn(query);
      }

      for (const [name, value] of Object.entries(customFilters)) {
        const filterFn = this._filters[name];
        if (filterFn && value !== undefined && value !== null && value !== '') {
          const next = filterFn(query, value, { request, filter: name });
          if (next) query = next;
        }
      }

      // Apply computed columns as selects
      for (const [name, expr] of Object.entries(this._computedColumns)) {
        query = query.selectRaw(`(${expr}) as ${name}`);
      }

      // Global search
      if (request.search.value) {
        const searchValue = request.search.value;
        const operator = this.searchOperator();
        const searchCols = this._searchable.length > 0
          ? this._searchable
          : request.columns.filter((c) => c.searchable).map((c) => c.data);

        if (searchCols.length > 0) {
          query = query.whereNested((q: any) => {
            for (let i = 0; i < searchCols.length; i++) {
              const col = searchCols[i];
              if (i === 0) {
                q.where(col, operator, `%${searchValue}%`);
              } else {
                q.orWhere(col, operator, `%${searchValue}%`);
              }
            }
          });
        }
      }

      // Per-column search
      for (const col of request.columns) {
        if (col.search.value && col.searchable) {
          query = query.where(col.data, this.searchOperator(), `%${col.search.value}%`);
        }
      }

      // Get filtered count
      const countQuery = query.clone();
      const recordsFiltered = await countQuery.count();

      // Ordering
      for (const order of request.order) {
        const col = request.columns[order.column];
        if (col) {
          const orderableList = this.sortableColumns(request);

          if (orderableList.includes(col.data)) {
            query = query.orderBy(col.data, order.dir);
          }
        }
      }

      // Pagination
      query = query.offset(request.start).limit(request.length);

      // Execute
      const data = await query.get();

      return {
        draw: request.draw,
        recordsTotal,
        recordsFiltered,
        data,
      };
    } catch (err: any) {
      return {
        draw: request.draw,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        error: err.message ?? 'Server error',
      };
    }
  }
}
