import type { DataTableRequest, DataTableResponse } from '../types.js';

export interface DataTableServiceOptions {
  searchable?: string[];
  orderable?: string[];
  baseQuery?: (query: any) => any;
  scopes?: Record<string, (query: any) => any>;
  computedColumns?: Record<string, string>;
}

export class DataTableService<T = any> {
  private _model: any;
  private _searchable: string[] = [];
  private _orderable: string[] = [];
  private _baseQueryFn: ((query: any) => any) | null = null;
  private _scopes: Record<string, (query: any) => any> = {};
  private _computedColumns: Record<string, string> = {};
  private _activeScopes: string[] = [];

  constructor(model: any, options?: DataTableServiceOptions) {
    this._model = model;
    if (options?.searchable) this._searchable = options.searchable;
    if (options?.orderable) this._orderable = options.orderable;
    if (options?.baseQuery) this._baseQueryFn = options.baseQuery;
    if (options?.scopes) this._scopes = options.scopes;
    if (options?.computedColumns) this._computedColumns = options.computedColumns;
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

  async process(request: DataTableRequest): Promise<DataTableResponse<T>> {
    try {
      // Get total count (unfiltered)
      const totalQuery = this._model.query();
      if (this._baseQueryFn) this._baseQueryFn(totalQuery);
      const recordsTotal = await totalQuery.count();

      // Build filtered query
      let query = this._model.query();
      if (this._baseQueryFn) this._baseQueryFn(query);

      // Apply active scopes
      for (const scopeName of this._activeScopes) {
        const scopeFn = this._scopes[scopeName];
        if (scopeFn) scopeFn(query);
      }

      // Apply computed columns as selects
      for (const [name, expr] of Object.entries(this._computedColumns)) {
        query = query.selectRaw(`(${expr}) as ${name}`);
      }

      // Global search
      if (request.search.value) {
        const searchValue = request.search.value;
        const searchCols = this._searchable.length > 0
          ? this._searchable
          : request.columns.filter((c) => c.searchable).map((c) => c.data);

        if (searchCols.length > 0) {
          query = query.whereNested((q: any) => {
            for (let i = 0; i < searchCols.length; i++) {
              const col = searchCols[i];
              if (i === 0) {
                q.where(col, 'LIKE', `%${searchValue}%`);
              } else {
                q.orWhere(col, 'LIKE', `%${searchValue}%`);
              }
            }
          });
        }
      }

      // Per-column search
      for (const col of request.columns) {
        if (col.search.value && col.searchable) {
          query = query.where(col.data, 'LIKE', `%${col.search.value}%`);
        }
      }

      // Get filtered count
      const countQuery = query.clone();
      const recordsFiltered = await countQuery.count();

      // Ordering
      for (const order of request.order) {
        const col = request.columns[order.column];
        if (col) {
          const orderableList = this._orderable.length > 0
            ? this._orderable
            : request.columns.filter((c) => c.orderable).map((c) => c.data);

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
