import type { Component } from 'svelte';
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
    footer?: string | ((rows: T[]) => string | number);
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
export interface DataTableRequest {
    draw: number;
    start: number;
    length: number;
    search: {
        value: string;
        regex: boolean;
    };
    order: {
        column: number;
        dir: 'asc' | 'desc';
    }[];
    columns: {
        data: string;
        name: string;
        searchable: boolean;
        orderable: boolean;
        search: {
            value: string;
            regex: boolean;
        };
    }[];
}
export interface DataTableResponse<T = any> {
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
    data: T[];
    error?: string;
}
export interface EditorFieldDef {
    name: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    options?: {
        label: string;
        value: any;
    }[];
    multiple?: boolean;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    dependsOn?: string;
    dependsOnValue?: any;
    showWhen?: (formData: Record<string, any>) => boolean;
    defaultValue?: any;
}
export interface ButtonDef {
    key: string;
    label: string;
    icon?: Component<any>;
    action?: string | ((selectedRows: any[], allData: any[]) => void | Promise<void>);
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    disabled?: boolean | ((selectedRows: any[]) => boolean);
    collection?: ButtonDef[];
}
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
export interface DataTableConfig<T = any> {
    data?: T[];
    serverUrl?: string;
    serverMethod?: 'GET' | 'POST';
    csrfCookieName?: string;
    csrfHeaderName?: string;
    columns: ColumnDef<T>[];
    sortable?: boolean;
    searchable?: boolean;
    paginate?: boolean;
    selectable?: SelectionMode;
    perPage?: number;
    perPageOptions?: number[];
    searchDebounceMs?: number;
    stateSaveKey?: string;
    rowId?: string | ((row: T) => string | number);
    rowClass?: string | ((row: T, index: number) => string);
    buttons?: (ButtonDef | ExportFormat)[];
    editorMode?: EditorMode;
    editorFields?: EditorFieldDef[];
    onSort?: (sort: SortState[]) => void;
    onFilter?: (filters: FilterState[]) => void;
    onPageChange?: (page: number, perPage: number) => void;
    onSelect?: (selectedRows: T[]) => void;
    onRowClick?: (row: T, event: MouseEvent) => void;
    onEdit?: (row: T, data: Record<string, any>) => void | Promise<void>;
    onCellEdit?: (row: T, columnKey: string, newValue: any, oldValue: any) => void | Promise<void>;
    onCreate?: (data: Record<string, any>) => void | Promise<void>;
    onDelete?: (rows: T[]) => void | Promise<void>;
    virtualScroll?: boolean;
    virtualRowHeight?: number;
    responsive?: boolean;
    groupBy?: string;
    expandable?: boolean;
    emptyText?: string;
    loadingText?: string;
    className?: string;
    compact?: boolean;
    striped?: boolean;
    hover?: boolean;
    bordered?: boolean;
    classNames?: DataTableClassNames;
    unstyled?: boolean;
}
export interface DataTableState<T = any> {
    allRows: T[];
    filteredRows: T[];
    sortedRows: T[];
    paginatedRows: T[];
    sort: SortState[];
    filters: FilterState[];
    globalSearch: string;
    pagination: PaginationState;
    selectedIds: Set<string | number>;
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
    loading: boolean;
    error: string | null;
    editingRowId: string | number | null;
    editingColumn: string | null;
    editorMode: EditorMode | null;
    formData: Record<string, any>;
    validationErrors: Record<string, string>;
    draw: number;
    excelFocusedCell: {
        rowIndex: number;
        columnKey: string;
    } | null;
    excelEditingCell: {
        rowIndex: number;
        columnKey: string;
    } | null;
    excelEditValue: string;
}
