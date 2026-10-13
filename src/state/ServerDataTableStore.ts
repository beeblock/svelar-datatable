import type { DataTableConfig, DataTableRequest, DataTableResponse, FilterState, SortState } from '../types.js';
import { DataTableStore } from './DataTableStore.js';

function getCsrfToken(cookieName = 'XSRF-TOKEN'): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  try {
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export class ServerDataTableStore<T = any> extends DataTableStore<T> {
  private _serverUrl: string;
  private _serverMethod: 'GET' | 'POST';
  private _serverParams?: Record<string, any> | (() => Record<string, any>);
  private _drawCounter = 0;
  private _abortController: AbortController | null = null;
  private _fetchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _serverColumns: { data: string; name: string; searchable: boolean; orderable: boolean }[];
  private _csrfCookieName: string;
  private _csrfHeaderName: string;
  private _searchDebounceMs: number;
  private _destroyed = false;

  constructor(config: DataTableConfig<T>) {
    super(config);
    this._serverUrl = config.serverUrl!;
    this._serverMethod = config.serverMethod ?? 'GET';
    this._serverParams = config.serverParams;
    this._csrfCookieName = config.csrfCookieName ?? 'XSRF-TOKEN';
    this._csrfHeaderName = config.csrfHeaderName ?? 'X-CSRF-Token';
    this._searchDebounceMs = config.searchDebounceMs ?? 300;
    this._serverColumns = config.columns.map((c) => ({
      data: c.key,
      name: c.key,
      searchable: c.searchable !== false,
      orderable: c.sortable !== false && c.orderable !== false,
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

  private _resolveServerParams(): Record<string, any> {
    if (!this._serverParams) return {};
    return typeof this._serverParams === 'function' ? this._serverParams() : this._serverParams;
  }

  override setSort(sort: SortState[]) {
    const state = this.getState();
    // Update sort in state without recomputing locally
    this._state = { ...state, sort, pagination: { ...state.pagination, page: 1 } };
    this._notify();
    this._saveState();
    this._debouncedFetch();
  }

  override setGlobalSearch(search: string) {
    const state = this.getState();
    this._state = { ...state, globalSearch: search, pagination: { ...state.pagination, page: 1 } };
    this._notify();
    this._saveState();
    this._debouncedFetch();
  }

  override setFilters(filters: FilterState[]) {
    const state = this.getState();
    this._state = { ...state, filters, pagination: { ...state.pagination, page: 1 } };
    this._notify();
    this._saveState();
    this._debouncedFetch();
  }

  override setPage(page: number) {
    const state = this.getState();
    this._state = { ...state, pagination: { ...state.pagination, page } };
    this._saveState();
    void this._fetchFromServer();
  }

  override setPerPage(perPage: number) {
    const state = this.getState();
    this._state = { ...state, pagination: { ...state.pagination, perPage, page: 1 } };
    this._saveState();
    void this._fetchFromServer();
  }

  private _debouncedFetch() {
    // Invalidate pending work as soon as the requested table state changes.
    this._drawCounter++;
    this._abortController?.abort();
    if (this._fetchDebounceTimer) clearTimeout(this._fetchDebounceTimer);
    this._fetchDebounceTimer = setTimeout(() => {
      this._fetchDebounceTimer = null;
      void this._fetchFromServer();
    }, this._searchDebounceMs);
  }

  async _fetchFromServer() {
    if (this._destroyed) return;
    if (this._fetchDebounceTimer) {
      clearTimeout(this._fetchDebounceTimer);
      this._fetchDebounceTimer = null;
    }
    if (this._abortController) this._abortController.abort();
    const controller = new AbortController();
    this._abortController = controller;

    const state = this.getState();
    this.setLoading(true);
    this.setError(null);

    const draw = ++this._drawCounter;
    try {
      const customFilters = this._resolveServerParams();
      const request: DataTableRequest = {
        draw,
        start: (state.pagination.page - 1) * state.pagination.perPage,
        length: state.pagination.perPage,
        search: { value: state.globalSearch, regex: false },
        customFilters,
        order: state.sort.map((s) => ({
          column: this._serverColumns.findIndex((c) => c.data === s.column),
          dir: s.direction,
        })).filter((order) => order.column >= 0),
        columns: this._serverColumns.map((col) => ({
          ...col,
          search: {
            value: String(state.filters.find((f) => f.column === col.data)?.value ?? ''),
            regex: false,
          },
        })),
      };

      let response: Response;

      if (this._serverMethod === 'POST') {
        response = await fetch(this._serverUrl, {
          method: 'POST',
          headers: this._buildHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } else {
        const params = new URLSearchParams();
        params.set('draw', String(request.draw));
        params.set('start', String(request.start));
        params.set('length', String(request.length));
        params.set('search[value]', request.search.value);
        params.set('search[regex]', String(request.search.regex));
        Object.entries(customFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(`filters[${key}]`, String(value));
          }
        });

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

        const [baseUrl, fragment] = this._serverUrl.split('#', 2);
        const separator = baseUrl.includes('?') ? (/[?&]$/.test(baseUrl) ? '' : '&') : '?';
        const url = `${baseUrl}${separator}${params.toString()}${fragment === undefined ? '' : `#${fragment}`}`;
        response = await fetch(url, { signal: controller.signal });
      }

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const json: DataTableResponse<T> = await response.json();

      // Only accept if this is the latest draw
      if (this._destroyed || controller.signal.aborted || draw !== this._drawCounter) return;
      if (json.draw !== draw || !Array.isArray(json.data)
        || !Number.isSafeInteger(json.recordsTotal) || json.recordsTotal < 0
        || !Number.isSafeInteger(json.recordsFiltered) || json.recordsFiltered < 0) {
        throw new Error('Invalid table response');
      }
      this.setServerResponse(json);
    } catch (err: any) {
      if (this._destroyed || controller.signal.aborted || draw !== this._drawCounter) return;
      this.setLoading(false);
      this.setError(err.message ?? 'Failed to fetch data');
    }
  }

  async initialFetch() {
    await this._fetchFromServer();
  }

  destroy() {
    this._destroyed = true;
    this._drawCounter++;
    if (this._abortController) this._abortController.abort();
    if (this._fetchDebounceTimer) clearTimeout(this._fetchDebounceTimer);
  }
}
