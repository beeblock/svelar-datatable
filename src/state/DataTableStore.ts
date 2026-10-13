import type { ColumnDef, DataTableConfig, DataTableState, FilterState, SortState, PaginationState } from '../types.js';

type Listener = () => void;

export class DataTableStore<T = any> {
  protected _state: DataTableState<T>;
  private _listeners = new Set<Listener>();
  private _columns: ColumnDef<T>[] = [];
  private _rowIdFn: (row: T) => string | number;
  private _stateSaveKey: string | null = null;
  private _lastSelectedId: string | number | null = null;
  private _paginate: boolean = true;

  constructor(config: DataTableConfig<T>) {
    this._columns = config.columns;
    this._stateSaveKey = config.stateSaveKey ?? null;
    this._paginate = config.paginate !== false;
    this._rowIdFn = typeof config.rowId === 'function'
      ? config.rowId
      : (row: any) => row[config.rowId as string ?? 'id'];

    const savedState = this._loadState();

    this._state = {
      allRows: config.data ?? [],
      filteredRows: [],
      sortedRows: [],
      paginatedRows: [],
      sort: savedState?.sort ?? [],
      filters: savedState?.filters ?? [],
      globalSearch: savedState?.globalSearch ?? '',
      pagination: {
        page: savedState?.page ?? 1,
        perPage: config.perPage ?? 15,
        total: 0,
        lastPage: 1,
      },
      selectedIds: new Set(),
      columnVisibility: savedState?.columnVisibility ?? Object.fromEntries(
        config.columns.map((c) => [c.key, c.visible !== false])
      ),
      columnOrder: savedState?.columnOrder ?? config.columns.map((c) => c.key),
      loading: false,
      error: null,
      editingRowId: null,
      editingColumn: null,
      editorMode: null,
      formData: {},
      validationErrors: {},
      draw: 0,
      excelFocusedCell: null,
      excelEditingCell: null,
      excelEditValue: '',
    };

    this._recompute();
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getState(): DataTableState<T> {
    return this._state;
  }

  protected _notify() {
    for (const listener of this._listeners) listener();
  }

  protected _saveState() {
    if (!this._stateSaveKey) return;
    try {
      const toSave = {
        sort: this._state.sort,
        filters: this._state.filters,
        globalSearch: this._state.globalSearch,
        page: this._state.pagination.page,
        columnVisibility: this._state.columnVisibility,
        columnOrder: this._state.columnOrder,
      };
      localStorage.setItem(this._stateSaveKey, JSON.stringify(toSave));
    } catch {}
  }

  private _loadState(): any {
    if (!this._stateSaveKey) return null;
    try {
      const raw = localStorage.getItem(this._stateSaveKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Set data (replaces all rows)
  setData(rows: T[]) {
    this._state = { ...this._state, allRows: rows };
    this._recompute();
  }

  // Sorting
  setSort(sort: SortState[]) {
    this._state = { ...this._state, sort, pagination: { ...this._state.pagination, page: 1 } };
    this._recompute();
    this._saveState();
  }

  toggleSort(column: string, multiSort: boolean = false) {
    const existing = this._state.sort.find((s) => s.column === column);
    let newSort: SortState[];

    if (existing) {
      if (existing.direction === 'asc') {
        newSort = multiSort
          ? this._state.sort.map((s) => s.column === column ? { ...s, direction: 'desc' as const } : s)
          : [{ column, direction: 'desc' }];
      } else {
        // Remove sort
        newSort = multiSort
          ? this._state.sort.filter((s) => s.column !== column)
          : [];
      }
    } else {
      newSort = multiSort
        ? [...this._state.sort, { column, direction: 'asc' }]
        : [{ column, direction: 'asc' }];
    }

    this.setSort(newSort);
  }

  // Searching
  setGlobalSearch(search: string) {
    this._state = { ...this._state, globalSearch: search, pagination: { ...this._state.pagination, page: 1 } };
    this._recompute();
    this._saveState();
  }

  // Filtering
  setFilters(filters: FilterState[]) {
    this._state = { ...this._state, filters, pagination: { ...this._state.pagination, page: 1 } };
    this._recompute();
    this._saveState();
  }

  setColumnFilter(column: string, value: any, operator: FilterState['operator'] = 'like') {
    const filters = this._state.filters.filter((f) => f.column !== column);
    if (value !== '' && value !== null && value !== undefined) {
      filters.push({ column, value, operator });
    }
    this.setFilters(filters);
  }

  // Pagination
  setPage(page: number) {
    const lastPage = this._state.pagination.lastPage;
    const safePage = Math.max(1, Math.min(page, lastPage));
    this._state = { ...this._state, pagination: { ...this._state.pagination, page: safePage } };
    this._recompute();
    this._saveState();
  }

  setPerPage(perPage: number) {
    this._state = { ...this._state, pagination: { ...this._state.pagination, perPage, page: 1 } };
    this._recompute();
    this._saveState();
  }

  // Column visibility
  toggleColumnVisibility(column: string) {
    const vis = { ...this._state.columnVisibility };
    vis[column] = !vis[column];
    this._state = { ...this._state, columnVisibility: vis };
    this._notify();
    this._saveState();
  }

  setColumnVisibility(visibility: Record<string, boolean>) {
    this._state = { ...this._state, columnVisibility: visibility };
    this._notify();
    this._saveState();
  }

  // Column reorder
  reorderColumns(columnOrder: string[]) {
    this._state = { ...this._state, columnOrder };
    this._notify();
    this._saveState();
  }

  // Selection
  getRowId(row: T): string | number {
    return this._rowIdFn(row);
  }

  toggleSelect(rowId: string | number) {
    const selected = new Set(this._state.selectedIds);
    if (selected.has(rowId)) {
      selected.delete(rowId);
    } else {
      selected.add(rowId);
    }
    this._lastSelectedId = rowId;
    this._state = { ...this._state, selectedIds: selected };
    this._notify();
  }

  getLastSelectedId(): string | number | null {
    return this._lastSelectedId;
  }

  selectSingle(rowId: string | number) {
    this._state = { ...this._state, selectedIds: new Set([rowId]) };
    this._notify();
  }

  selectAll() {
    const ids = this._state.filteredRows.map((row) => this.getRowId(row));
    this._state = { ...this._state, selectedIds: new Set(ids) };
    this._notify();
  }

  deselectAll() {
    this._state = { ...this._state, selectedIds: new Set() };
    this._notify();
  }

  selectRange(fromId: string | number, toId: string | number) {
    const rows = this._state.sortedRows;
    const fromIdx = rows.findIndex((r) => this.getRowId(r) === fromId);
    const toIdx = rows.findIndex((r) => this.getRowId(r) === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const selected = new Set(this._state.selectedIds);
    for (let i = start; i <= end; i++) {
      selected.add(this.getRowId(rows[i]));
    }
    this._state = { ...this._state, selectedIds: selected };
    this._notify();
  }

  getSelectedRows(): T[] {
    return this._state.allRows.filter((row) => this._state.selectedIds.has(this.getRowId(row)));
  }

  // Editor
  openEditor(rowId: string | number | null, column: string | null, mode: 'inline' | 'bubble' | 'modal') {
    const row = rowId !== null
      ? this._state.allRows.find((r) => this.getRowId(r) === rowId)
      : null;
    const formData = row ? { ...(row as any) } : {};
    this._state = {
      ...this._state,
      editingRowId: rowId,
      editingColumn: column,
      editorMode: mode,
      formData,
      validationErrors: {},
    };
    this._notify();
  }

  closeEditor() {
    this._state = {
      ...this._state,
      editingRowId: null,
      editingColumn: null,
      editorMode: null,
      formData: {},
      validationErrors: {},
    };
    this._notify();
  }

  setFormField(name: string, value: any) {
    this._state = {
      ...this._state,
      formData: { ...this._state.formData, [name]: value },
    };
    this._notify();
  }

  setValidationErrors(errors: Record<string, string>) {
    this._state = { ...this._state, validationErrors: errors };
    this._notify();
  }

  // Loading
  setLoading(loading: boolean) {
    this._state = { ...this._state, loading };
    this._notify();
  }

  setError(error: string | null) {
    this._state = { ...this._state, error };
    this._notify();
  }

  // Server-side response
  setServerResponse(response: { data: T[]; recordsTotal: number; recordsFiltered: number; draw: number }) {
    this._state = {
      ...this._state,
      allRows: response.data,
      filteredRows: response.data,
      sortedRows: response.data,
      paginatedRows: response.data,
      loading: false,
      draw: response.draw,
      pagination: {
        ...this._state.pagination,
        total: response.recordsFiltered,
        lastPage: Math.ceil(response.recordsFiltered / this._state.pagination.perPage) || 1,
      },
    };
    this._notify();
  }

  // Clear state
  resetState() {
    this._state = {
      ...this._state,
      sort: [],
      filters: [],
      globalSearch: '',
      pagination: { ...this._state.pagination, page: 1 },
      selectedIds: new Set(),
    };
    this._recompute();
    if (this._stateSaveKey) {
      try { localStorage.removeItem(this._stateSaveKey); } catch {}
    }
  }

  // Excel mode
  focusCell(rowIndex: number, columnKey: string) {
    this._state = {
      ...this._state,
      excelFocusedCell: { rowIndex, columnKey },
    };
    this._notify();
  }

  startCellEdit() {
    const focused = this._state.excelFocusedCell;
    if (!focused) return;
    const row = this._state.paginatedRows[focused.rowIndex] as any;
    if (!row) return;
    const col = this._columns.find((c) => c.key === focused.columnKey);
    if (!col || col.editable === false) return;
    this._state = {
      ...this._state,
      excelEditingCell: { ...focused },
      excelEditValue: row[focused.columnKey] != null ? String(row[focused.columnKey]) : '',
    };
    this._notify();
  }

  setExcelEditValue(value: string) {
    this._state = { ...this._state, excelEditValue: value };
    // No notify needed — the input component manages its own value
  }

  // Returns { row, columnKey, oldValue, newValue } if there was a change, null otherwise
  commitCellEdit(): { row: any; columnKey: string; oldValue: any; newValue: any } | null {
    const editing = this._state.excelEditingCell;
    if (!editing) return null;
    const row = this._state.paginatedRows[editing.rowIndex] as any;
    if (!row) { this.cancelCellEdit(); return null; }

    const col = this._columns.find((c) => c.key === editing.columnKey);
    const oldValue = row[editing.columnKey];
    let newValue: any = this._state.excelEditValue;

    // Cast value based on column type
    if (col?.type === 'number') newValue = newValue === '' ? null : Number(newValue);
    else if (col?.type === 'boolean') newValue = newValue === 'true' || newValue === '1';
    else if (newValue === '') newValue = null;

    this._state = {
      ...this._state,
      excelEditingCell: null,
      excelEditValue: '',
    };

    if (newValue === oldValue || (newValue === null && (oldValue === null || oldValue === undefined))) {
      this._notify();
      return null;
    }

    // Update local data for client-side
    row[editing.columnKey] = newValue;
    this._notify();

    return { row, columnKey: editing.columnKey, oldValue, newValue };
  }

  cancelCellEdit() {
    this._state = {
      ...this._state,
      excelEditingCell: null,
      excelEditValue: '',
    };
    this._notify();
  }

  clearExcelFocus() {
    this._state = {
      ...this._state,
      excelFocusedCell: null,
      excelEditingCell: null,
      excelEditValue: '',
    };
    this._notify();
  }

  getVisibleColumns(): ColumnDef[] {
    return this._state.columnOrder
      .filter((key) => this._state.columnVisibility[key] !== false)
      .map((key) => this._columns.find((c) => c.key === key))
      .filter(Boolean) as ColumnDef[];
  }

  // Navigate to adjacent cell. Returns 'page-next' | 'page-prev' | null
  navigateCell(direction: 'up' | 'down' | 'left' | 'right'): 'page-next' | 'page-prev' | null {
    const focused = this._state.excelFocusedCell;
    const rows = this._state.paginatedRows;
    const visibleCols = this.getVisibleColumns();
    if (visibleCols.length === 0) return null;

    if (!focused) {
      // Focus first editable cell
      const firstEditable = visibleCols.find((c) => c.editable !== false);
      if (firstEditable && rows.length > 0) {
        this.focusCell(0, firstEditable.key);
      }
      return null;
    }

    let { rowIndex, columnKey } = focused;
    const colIdx = visibleCols.findIndex((c) => c.key === columnKey);
    if (colIdx === -1) return null;

    switch (direction) {
      case 'left': {
        // Find previous editable column
        for (let i = colIdx - 1; i >= 0; i--) {
          if (visibleCols[i].editable !== false) {
            this.focusCell(rowIndex, visibleCols[i].key);
            return null;
          }
        }
        // Wrap to last editable col of previous row
        for (let i = visibleCols.length - 1; i >= 0; i--) {
          if (visibleCols[i].editable !== false) {
            if (rowIndex > 0) {
              this.focusCell(rowIndex - 1, visibleCols[i].key);
              return null;
            } else {
              return 'page-prev';
            }
          }
        }
        return null;
      }
      case 'right': {
        for (let i = colIdx + 1; i < visibleCols.length; i++) {
          if (visibleCols[i].editable !== false) {
            this.focusCell(rowIndex, visibleCols[i].key);
            return null;
          }
        }
        // Wrap to first editable col of next row
        for (let i = 0; i < visibleCols.length; i++) {
          if (visibleCols[i].editable !== false) {
            if (rowIndex < rows.length - 1) {
              this.focusCell(rowIndex + 1, visibleCols[i].key);
              return null;
            } else {
              return 'page-next';
            }
          }
        }
        return null;
      }
      case 'up': {
        if (rowIndex > 0) {
          this.focusCell(rowIndex - 1, columnKey);
          return null;
        }
        return 'page-prev';
      }
      case 'down': {
        if (rowIndex < rows.length - 1) {
          this.focusCell(rowIndex + 1, columnKey);
          return null;
        }
        return 'page-next';
      }
    }
  }

  // Core recompute pipeline: filter -> sort -> paginate
  private _recompute() {
    let rows = [...this._state.allRows];

    // 1. Global search
    if (this._state.globalSearch) {
      const searchLower = this._state.globalSearch.toLowerCase();
      const searchableCols = this._columns.filter((c) => c.searchable !== false);
      rows = rows.filter((row: any) =>
        searchableCols.some((col) => {
          const val = row[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(searchLower);
        })
      );
    }

    // 2. Column filters
    for (const filter of this._state.filters) {
      rows = rows.filter((row: any) => {
        const val = row[filter.column];
        switch (filter.operator) {
          case '=': return val == filter.value;
          case '!=': return val != filter.value;
          case '>': return val > filter.value;
          case '<': return val < filter.value;
          case '>=': return val >= filter.value;
          case '<=': return val <= filter.value;
          case 'like': return val !== null && val !== undefined && String(val).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'not_like': return val === null || val === undefined || !String(val).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'in': return Array.isArray(filter.value) && filter.value.includes(val);
          case 'between': return Array.isArray(filter.value) && val >= filter.value[0] && val <= filter.value[1];
          case 'null': return val === null || val === undefined;
          case 'not_null': return val !== null && val !== undefined;
          default: return true;
        }
      });
    }

    const filteredRows = rows;

    // 3. Sort
    if (this._state.sort.length > 0) {
      rows = [...rows].sort((a: any, b: any) => {
        for (const s of this._state.sort) {
          const colDef = this._columns.find((c) => c.key === s.column);
          const aVal = a[s.column];
          const bVal = b[s.column];

          let cmp = 0;
          if (aVal === null || aVal === undefined) cmp = -1;
          else if (bVal === null || bVal === undefined) cmp = 1;
          else if (colDef?.type === 'number') cmp = Number(aVal) - Number(bVal);
          else if (colDef?.type === 'date') cmp = new Date(aVal).getTime() - new Date(bVal).getTime();
          else if (colDef?.type === 'boolean') cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0);
          else cmp = String(aVal).localeCompare(String(bVal));

          if (cmp !== 0) return s.direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    const sortedRows = rows;

    // 4. Paginate
    const total = filteredRows.length;
    const perPage = this._state.pagination.perPage;
    let paginatedRows: T[];
    let page: number;
    let lastPage: number;

    if (this._paginate) {
      lastPage = Math.ceil(total / perPage) || 1;
      page = Math.min(this._state.pagination.page, lastPage);
      const start = (page - 1) * perPage;
      paginatedRows = sortedRows.slice(start, start + perPage);
    } else {
      // No pagination — all rows visible (used with virtual scroll)
      paginatedRows = sortedRows;
      page = 1;
      lastPage = 1;
    }

    this._state = {
      ...this._state,
      filteredRows,
      sortedRows,
      paginatedRows,
      pagination: { page, perPage, total, lastPage },
    };

    this._notify();
  }
}
