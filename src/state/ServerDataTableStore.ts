import type { DataTableConfig, DataTableRequest, DataTableResponse, DataTableState, FilterState, SortState } from '../types.js';
import { DataTableStore } from './DataTableStore.js';

function getCsrfToken(cookieName = 'XSRF-TOKEN'): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export class ServerDataTableStore<T = any> extends DataTableStore<T> {
  private _serverUrl: string;
  private _serverMethod: 'GET' | 'POST';
  private _drawCounter = 0;
  private _abortController: AbortController | null = null;
  private _fetchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _serverColumns: { data: string; name: string; searchable: boolean; orderable: boolean }[];
  private _csrfCookieName: string;
  private _csrfHeaderName: string;

  constructor(config: DataTableConfig<T>) {
    super(config);
    this._serverUrl = config.serverUrl!;
    this._serverMethod = config.serverMethod ?? 'GET';
    this._csrfCookieName = config.csrfCookieName ?? 'XSRF-TOKEN';
    this._csrfHeaderName = config.csrfHeaderName ?? 'X-CSRF-Token';
    this._serverColumns = config.columns.map((c) => ({
      data: c.key,
      name: c.key,
      searchable: c.searchable !== false,
      orderable: c.sortable !== false,
    }));
  }

  private _buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = getCsrfToken(this._csrfCookieName);
    if (token) {
      headers[this._csrfHeaderName] = token;
    }
    return headers;
  }

  override setSort(sort: SortState[]) {
    const state = this.getState();
    // Update sort in state without recomputing locally
    (this as any)._state = { ...state, sort, pagination: { ...state.pagination, page: 1 } };
    this._debouncedFetch();
  }

  override setGlobalSearch(search: string) {
    const state = this.getState();
    (this as any)._state = { ...state, globalSearch: search, pagination: { ...state.pagination, page: 1 } };
    this._debouncedFetch();
  }

  override setFilters(filters: FilterState[]) {
    const state = this.getState();
    (this as any)._state = { ...state, filters, pagination: { ...state.pagination, page: 1 } };
    this._debouncedFetch();
  }

  override setPage(page: number) {
    const state = this.getState();
    (this as any)._state = { ...state, pagination: { ...state.pagination, page } };
    this._fetchFromServer();
  }

  override setPerPage(perPage: number) {
    const state = this.getState();
    (this as any)._state = { ...state, pagination: { ...state.pagination, perPage, page: 1 } };
    this._fetchFromServer();
  }

  private _debouncedFetch() {
    if (this._fetchDebounceTimer) clearTimeout(this._fetchDebounceTimer);
    this._fetchDebounceTimer = setTimeout(() => this._fetchFromServer(), 300);
  }

  async _fetchFromServer() {
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();

    const state = this.getState();
    this.setLoading(true);
    this.setError(null);

    const draw = ++this._drawCounter;
    const request: DataTableRequest = {
      draw,
      start: (state.pagination.page - 1) * state.pagination.perPage,
      length: state.pagination.perPage,
      search: { value: state.globalSearch, regex: false },
      order: state.sort.map((s) => ({
        column: this._serverColumns.findIndex((c) => c.data === s.column),
        dir: s.direction,
      })),
      columns: this._serverColumns.map((col) => ({
        ...col,
        search: {
          value: state.filters.find((f) => f.column === col.data)?.value ?? '',
          regex: false,
        },
      })),
    };

    try {
      let response: Response;

      if (this._serverMethod === 'POST') {
        response = await fetch(this._serverUrl, {
          method: 'POST',
          headers: this._buildHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(request),
          signal: this._abortController.signal,
        });
      } else {
        const params = new URLSearchParams();
        params.set('draw', String(request.draw));
        params.set('start', String(request.start));
        params.set('length', String(request.length));
        params.set('search[value]', request.search.value);
        params.set('search[regex]', String(request.search.regex));

        request.order.forEach((o, i) => {
          params.set(`order[${i}][column]`, String(o.column));
          params.set(`order[${i}][dir]`, o.dir);
        });

        request.columns.forEach((c, i) => {
          params.set(`columns[${i}][data]`, c.data);
          params.set(`columns[${i}][name]`, c.name);
          params.set(`columns[${i}][searchable]`, String(c.searchable));
          params.set(`columns[${i}][orderable]`, String(c.orderable));
          params.set(`columns[${i}][search][value]`, c.search.value);
          params.set(`columns[${i}][search][regex]`, String(c.search.regex));
        });

        const url = `${this._serverUrl}?${params.toString()}`;
        response = await fetch(url, { signal: this._abortController.signal });
      }

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const json: DataTableResponse<T> = await response.json();

      // Only accept if this is the latest draw
      if (json.draw === draw) {
        this.setServerResponse(json);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.setLoading(false);
      this.setError(err.message ?? 'Failed to fetch data');
    }
  }

  async initialFetch() {
    await this._fetchFromServer();
  }

  destroy() {
    if (this._abortController) this._abortController.abort();
    if (this._fetchDebounceTimer) clearTimeout(this._fetchDebounceTimer);
  }
}
