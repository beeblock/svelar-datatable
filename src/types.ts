import type { Component } from 'svelte';

// Column definition
export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'html' | 'custom';
export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'not_like' | 'in' | 'between' | 'null' | 'not_null';
export type SelectionMode = 'none' | 'single' | 'multi';
export type EditorMode = 'inline' | 'bubble' | 'modal' | 'excel';
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'checkbox' | 'radio' | 'date' | 'datetime' | 'upload' | 'hidden' | 'readonly';
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'clipboard' | 'print';

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  type?: ColumnType;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  className?: string;
  headerClassName?: string;
  orderable?: boolean;
  defaultSort?: 'asc' | 'desc';
  // Footer
  footer?: string | ((rows: T[]) => string | number);
  // Editor
  editable?: boolean;
  editorField?: EditorFieldDef;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  column: string;
  value: any;
  operator: FilterOperator;
}

export interface PaginationState {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
}

// Server-side protocol (compatible with jQuery DataTables wire protocol)
export interface DataTableRequest {
  draw: number;
  start: number;
  length: number;
  search: { value: string; regex: boolean };
  order: { column: number; dir: 'asc' | 'desc' }[];
  customFilters?: Record<string, any>;
  columns: {
    data: string;
    name: string;
    searchable: boolean;
    orderable: boolean;
    search: { value: string; regex: boolean };
  }[];
}

export interface DataTableResponse<T = any> {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
  error?: string;
}

// Editor
export interface EditorFieldDef {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: { label: string; value: any }[];
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  dependsOn?: string;
  dependsOnValue?: any;
  showWhen?: (formData: Record<string, any>) => boolean;
  defaultValue?: any;
}

// Buttons
export interface ButtonDef {
  key: string;
  label: string;
  icon?: Component<any>;
  action?: string | ((selectedRows: any[], allData: any[]) => void | Promise<void>);
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean | ((selectedRows: any[]) => boolean);
  collection?: ButtonDef[];
}

// CSS class overrides for full Tailwind customization
export interface DataTableClassNames {
  container?: string;
  toolbar?: string;
  toolbarLeft?: string;
  toolbarRight?: string;
  searchInput?: string;
  table?: string;
  thead?: string;
  th?: string;
  thSortable?: string;
  tbody?: string;
  tr?: string;
  trSelected?: string;
  trEven?: string;
  td?: string;
  tfoot?: string;
  tf?: string;
  pagination?: string;
  paginationInfo?: string;
  paginationControls?: string;
  pageButton?: string;
  pageButtonActive?: string;
  perPageSelect?: string;
  btn?: string;
  btnCreate?: string;
  btnEdit?: string;
  btnDelete?: string;
  editorModal?: string;
  editorBackdrop?: string;
  editorField?: string;
  editorInput?: string;
  editorLabel?: string;
  loading?: string;
  empty?: string;
  error?: string;
}

// Full config
export interface DataTableConfig<T = any> {
  // Data source
  data?: T[];
  serverUrl?: string;
  serverMethod?: 'GET' | 'POST';
  serverParams?: Record<string, any> | (() => Record<string, any>);
  // CSRF token config (defaults to Svelar conventions)
  csrfCookieName?: string;
  csrfHeaderName?: string;
  // Columns
  columns: ColumnDef<T>[];
  // Features
  sortable?: boolean;
  searchable?: boolean;
  paginate?: boolean;
  selectable?: SelectionMode;
  // Pagination
  perPage?: number;
  perPageOptions?: number[];
  // Search
  searchDebounceMs?: number;
  // State
  stateSaveKey?: string;
  // Row identity
  rowId?: string | ((row: T) => string | number);
  // Row classes
  rowClass?: string | ((row: T, index: number) => string);
  // Buttons
  buttons?: (ButtonDef | ExportFormat)[];
  // Editor
  editorMode?: EditorMode;
  editorFields?: EditorFieldDef[];
  // Callbacks
  onSort?: (sort: SortState[]) => void;
  onFilter?: (filters: FilterState[]) => void;
  onPageChange?: (page: number, perPage: number) => void;
  onSelect?: (selectedRows: T[]) => void;
  onRowClick?: (row: T, event: MouseEvent) => void;
  onEdit?: (row: T, data: Record<string, any>) => void | Promise<void>;
  onCellEdit?: (row: T, columnKey: string, newValue: any, oldValue: any) => void | Promise<void>;
  onCreate?: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (rows: T[]) => void | Promise<void>;
  // Virtual scroll
  virtualScroll?: boolean;
  virtualRowHeight?: number;
  // Responsive
  responsive?: boolean;
  // Row grouping
  groupBy?: string;
  // Detail/child rows
  expandable?: boolean;
  // Empty state
  emptyText?: string;
  // Loading
  loadingText?: string;
  // CSS
  className?: string;
  compact?: boolean;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  // Tailwind / custom class overrides
  classNames?: DataTableClassNames;
  // Unstyled mode — disables all built-in CSS
  unstyled?: boolean;
}

// Store state shape
export interface DataTableState<T = any> {
  // Source data
  allRows: T[];
  // Derived
  filteredRows: T[];
  sortedRows: T[];
  paginatedRows: T[];
  // State
  sort: SortState[];
  filters: FilterState[];
  globalSearch: string;
  pagination: PaginationState;
  // Selection
  selectedIds: Set<string | number>;
  // Column state
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  // Loading
  loading: boolean;
  error: string | null;
  // Editor
  editingRowId: string | number | null;
  editingColumn: string | null;
  editorMode: EditorMode | null;
  formData: Record<string, any>;
  validationErrors: Record<string, string>;
  // Server draw
  draw: number;
  // Excel mode
  excelFocusedCell: { rowIndex: number; columnKey: string } | null;
  excelEditingCell: { rowIndex: number; columnKey: string } | null;
  excelEditValue: string;
}
