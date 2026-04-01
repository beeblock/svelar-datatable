<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { DataTableConfig, DataTableClassNames, ColumnDef, EditorFieldDef } from '../types.js';
  import { DataTableStore } from '../state/DataTableStore.js';
  import { ServerDataTableStore } from '../state/ServerDataTableStore.js';
  import DataTableToolbar from './DataTableToolbar.svelte';
  import DataTableHead from './DataTableHead.svelte';
  import DataTableBody from './DataTableBody.svelte';
  import DataTableFooter from './DataTableFooter.svelte';
  import DataTablePagination from './DataTablePagination.svelte';
  import DataTableEditor from './DataTableEditor.svelte';
  import { onMount } from 'svelte';

  interface Props extends DataTableConfig {
    // Snippet overrides
    customCell?: Snippet<[{ row: any; column: ColumnDef; value: any }]>;
    expandContent?: Snippet<[{ row: any }]>;
    // Expose store for external control (e.g. opening editor)
    storeRef?: DataTableStore;
  }

  let {
    // Data source
    data,
    serverUrl,
    serverMethod,
    // Columns
    columns,
    // Features
    sortable = true,
    searchable = true,
    paginate = true,
    selectable = 'none',
    // Pagination
    perPage = 15,
    perPageOptions = [10, 15, 25, 50, 100],
    // Search
    searchDebounceMs = 300,
    // State persistence
    stateSaveKey,
    // Row identity
    rowId = 'id',
    // Row appearance
    rowClass,
    // Buttons
    buttons,
    // Editor
    editorMode,
    editorFields,
    // Callbacks
    onSort,
    onFilter,
    onPageChange,
    onSelect,
    onRowClick,
    onEdit,
    onCellEdit,
    onCreate,
    onDelete,
    // Virtual scroll
    virtualScroll = false,
    virtualRowHeight = 48,
    // Features
    responsive = true,
    groupBy,
    expandable = false,
    // Text
    emptyText = 'No data available',
    loadingText = 'Loading...',
    // CSS
    className = '',
    compact = false,
    striped = true,
    hover = true,
    bordered = false,
    classNames = {} as DataTableClassNames,
    unstyled = false,
    // Snippets
    customCell,
    expandContent,
    // Store ref
    storeRef = $bindable(),
  }: Props = $props();

  // Build config object
  let config: DataTableConfig = $derived({
    data, serverUrl, serverMethod, columns, sortable, searchable, paginate,
    selectable, perPage, perPageOptions, searchDebounceMs, stateSaveKey,
    rowId, rowClass, buttons, editorMode, editorFields,
    onSort, onFilter, onPageChange, onSelect, onRowClick, onEdit, onCellEdit, onCreate, onDelete,
    virtualScroll, virtualRowHeight, responsive, groupBy, expandable,
    emptyText, loadingText, className, compact, striped, hover, bordered, classNames, unstyled,
  });

  // Create store
  let store: DataTableStore = $state(
    serverUrl
      ? new ServerDataTableStore(config)
      : new DataTableStore(config)
  );

  // Expose store ref for external control
  $effect(() => {
    storeRef = store;
  });

  let state = $state(store.getState());

  // Subscribe to store changes
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();

      // Fire callbacks
      if (onSort) onSort(state.sort);
      if (onFilter) onFilter(state.filters);
      if (onSelect) onSelect(store.getSelectedRows());
      if (onPageChange) onPageChange(state.pagination.page, state.pagination.perPage);
    });
  });

  // Update data when prop changes (client-side only)
  $effect(() => {
    if (data && !serverUrl) {
      store.setData(data);
    }
  });

  // Initial server fetch
  onMount(() => {
    if (serverUrl && store instanceof ServerDataTableStore) {
      store.initialFetch();
    }
    return () => {
      if (store instanceof ServerDataTableStore) {
        store.destroy();
      }
    };
  });

  // Editor submit handler
  async function handleEditorSubmit(formData: Record<string, any>) {
    const isCreate = state.editingRowId === null;
    try {
      if (isCreate && onCreate) {
        await onCreate(formData);
      } else if (!isCreate && onEdit) {
        const row = state.allRows.find((r) => store.getRowId(r) === state.editingRowId);
        if (row) await onEdit(row, formData);
      }
      store.closeEditor();
    } catch (err: any) {
      if (err.errors) {
        store.setValidationErrors(err.errors);
      }
    }
  }

  // Inline mode: handle cell edit commit
  async function handleInlineCommit(row: any, columnKey: string, newValue: any, oldValue: any) {
    try {
      if (onCellEdit) {
        await onCellEdit(row, columnKey, newValue, oldValue);
      }
      // Update local data
      (row as any)[columnKey] = newValue;
    } catch (err: any) {
      // Revert on error
      (row as any)[columnKey] = oldValue;
      store.setError(err.message ?? 'Failed to save cell');
    }
  }

  // Excel mode: commit cell edit and fire callback
  async function handleExcelCommit() {
    const result = store.commitCellEdit();
    if (!result) return;
    try {
      if (onCellEdit) {
        await onCellEdit(result.row, result.columnKey, result.newValue, result.oldValue);
      }
    } catch (err: any) {
      // Revert on error
      (result.row as any)[result.columnKey] = result.oldValue;
      store.setError(err.message ?? 'Failed to save cell');
    }
  }

  // Excel mode: navigate with cross-page support
  function handleExcelNavigate(direction: 'up' | 'down' | 'left' | 'right') {
    // Commit any pending edit first
    const result = store.commitCellEdit();
    if (result && onCellEdit) {
      onCellEdit(result.row, result.columnKey, result.newValue, result.oldValue).catch(() => {
        (result.row as any)[result.columnKey] = result.oldValue;
      });
    }

    const pageResult = store.navigateCell(direction);
    if (!pageResult) return;

    const pagination = store.getState().pagination;
    const visibleCols = store.getVisibleColumns();
    const firstEditableCol = visibleCols.find((c) => c.editable !== false);
    if (!firstEditableCol) return;

    if (pageResult === 'page-next' && pagination.page < pagination.lastPage) {
      store.setPage(pagination.page + 1);
      // Focus first row of new page after recompute
      setTimeout(() => store.focusCell(0, store.getState().excelFocusedCell?.columnKey ?? firstEditableCol.key), 0);
    } else if (pageResult === 'page-prev' && pagination.page > 1) {
      store.setPage(pagination.page - 1);
      // Focus last row of previous page after recompute
      setTimeout(() => {
        const rows = store.getState().paginatedRows;
        const colKey = store.getState().excelFocusedCell?.columnKey ?? firstEditableCol.key;
        store.focusCell(rows.length - 1, colKey);
      }, 0);
    }
  }

  // Bubble editor anchor tracking
  let bubbleAnchor: HTMLElement | null = $state(null);

  // Virtual scroll tracking
  let wrapperEl: HTMLDivElement | undefined = $state();
  let scrollTop = $state(0);
  let wrapperHeight = $state(400);

  function handleWrapperScroll(e: Event) {
    scrollTop = (e.target as HTMLDivElement).scrollTop;
  }

  // Table CSS classes
  let tableClasses = $derived([
    'sdt-table',
    compact ? 'sdt-compact' : '',
    striped ? 'sdt-striped' : '',
    hover ? 'sdt-hover' : '',
    bordered ? 'sdt-bordered' : '',
    responsive ? 'sdt-responsive' : '',
    editorMode === 'excel' ? 'sdt-excel' : '',
    className,
  ].filter(Boolean).join(' '));


</script>

<div class="{unstyled ? '' : 'sdt-container'} {classNames.container ?? ''} {className}">
  <DataTableToolbar
    {store}
    {columns}
    {searchable}
    {searchDebounceMs}
    {buttons}
    {editorMode}
    {classNames}
    onDeleteClick={onDelete}
  />

  {#if state.error}
    <div class="sdt-error">
      <span>{state.error}</span>
      <button type="button" onclick={() => store.setError(null)}>Dismiss</button>
    </div>
  {/if}

  <div
    bind:this={wrapperEl}
    class="{unstyled ? '' : 'sdt-table-wrapper'} {classNames.table ?? ''}"
    class:sdt-responsive={!unstyled && responsive}
    class:sdt-virtual-wrapper={virtualScroll}
    style:max-height={virtualScroll ? '500px' : undefined}
    onscroll={virtualScroll ? handleWrapperScroll : undefined}
  >
    <table class="{unstyled ? '' : tableClasses}">
      <DataTableHead {columns} {store} {selectable} {sortable} {expandable} {classNames} />
      <DataTableBody
        {columns}
        {store}
        {selectable}
        {expandable}
        {editorMode}
        {emptyText}
        {loadingText}
        {rowClass}
        {groupBy}
        {classNames}
        {onRowClick}
        {customCell}
        {expandContent}
        onExcelNavigate={editorMode === 'excel' ? handleExcelNavigate : undefined}
        onExcelCommit={editorMode === 'excel' ? handleExcelCommit : undefined}
        onInlineCommit={editorMode === 'inline' ? handleInlineCommit : undefined}
        onBubbleAnchor={editorMode === 'bubble' ? (el) => { bubbleAnchor = el; } : undefined}
        {virtualScroll}
        {virtualRowHeight}
        {scrollTop}
        containerHeight={500}
      />
      <DataTableFooter {columns} {store} {selectable} {expandable} {classNames} />
    </table>
  </div>

  {#if paginate}
    <DataTablePagination {store} {perPageOptions} {classNames} />
  {/if}

  {#if editorMode && editorMode !== 'excel' && editorFields}
    <DataTableEditor
      fields={editorFields}
      {store}
      {classNames}
      onsubmit={handleEditorSubmit}
      anchorEl={bubbleAnchor}
    />
  {/if}
</div>

<style>
  .sdt-container {
    background: var(--sdt-bg, #fff);
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.5rem;
    font-family: var(--sdt-font, inherit);
  }

  .sdt-table-wrapper {
    overflow-x: auto;
  }
  .sdt-table-wrapper.sdt-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .sdt-virtual-wrapper {
    overflow-y: auto;
  }

  .sdt-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  .sdt-table :global(.sdt-compact .sdt-cell),
  .sdt-table :global(.sdt-compact .sdt-th) {
    padding: 0.375rem 0.5rem;
  }

  .sdt-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
    color: #dc2626;
    font-size: 0.8125rem;
  }
  .sdt-error button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.8125rem;
  }

  /* Stripe via CSS variables so DataTableRow can use them */
  :global(.sdt-striped .sdt-row-even) {
    --sdt-row-stripe: rgba(0, 0, 0, 0.02);
    background-color: var(--sdt-row-stripe);
  }

  :global(.sdt-hover .sdt-row:hover) {
    --sdt-row-hover: #f9fafb;
    background-color: var(--sdt-row-hover) !important;
  }

  :global(.sdt-bordered .sdt-cell),
  :global(.sdt-bordered .sdt-th),
  :global(.sdt-bordered .sdt-tf) {
    border: 1px solid var(--sdt-border, #e5e7eb);
  }
</style>
