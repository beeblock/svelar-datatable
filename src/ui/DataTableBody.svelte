<script lang="ts">
  import type { ColumnDef, DataTableStore, SelectionMode, EditorMode, DataTableClassNames } from '../index.js';
  import type { Snippet } from 'svelte';
  import DataTableRow from './DataTableRow.svelte';
  import DataTableLoading from './DataTableLoading.svelte';
  import DataTableEmpty from './DataTableEmpty.svelte';

  interface Props {
    columns: ColumnDef[];
    store: DataTableStore;
    selectable?: SelectionMode;
    expandable?: boolean;
    editorMode?: EditorMode;
    emptyText?: string;
    loadingText?: string;
    rowClass?: string | ((row: any, index: number) => string);
    onRowClick?: (row: any, event: MouseEvent) => void;
    customCell?: Snippet<[{ row: any; column: ColumnDef; value: any }]>;
    expandContent?: Snippet<[{ row: any }]>;
    onExcelNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onExcelCommit?: () => void;
    onInlineCommit?: (row: any, columnKey: string, newValue: any, oldValue: any) => void;
    groupBy?: string;
    onBubbleAnchor?: (el: HTMLElement) => void;
    classNames?: DataTableClassNames;
    virtualScroll?: boolean;
    virtualRowHeight?: number;
    scrollTop?: number;
    containerHeight?: number;
  }
  let {
    columns,
    store,
    selectable = 'none',
    expandable = false,
    editorMode,
    emptyText = 'No data available',
    loadingText = 'Loading...',
    rowClass,
    onRowClick,
    customCell,
    expandContent,
    onExcelNavigate,
    onExcelCommit,
    onInlineCommit,
    groupBy,
    onBubbleAnchor,
    classNames = {},
    virtualScroll = false,
    virtualRowHeight = 48,
    scrollTop = 0,
    containerHeight = 500,
  }: Props = $props();

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let visibleColCount = $derived(
    state.columnOrder.filter((key) => state.columnVisibility[key] !== false).length
    + (selectable !== 'none' ? 1 : 0)
    + (expandable ? 1 : 0)
  );

  // Group rows by column value when groupBy is set
  let groupedRows = $derived(() => {
    if (!groupBy) return null;
    const groups: { key: string; rows: any[] }[] = [];
    const map = new Map<string, any[]>();
    for (const row of state.paginatedRows) {
      const key = String((row as any)[groupBy] ?? 'Other');
      if (!map.has(key)) {
        const arr: any[] = [];
        map.set(key, arr);
        groups.push({ key, rows: arr });
      }
      map.get(key)!.push(row);
    }
    return groups;
  });

  // Virtual scroll: compute visible row range
  let overscan = 5;
  let virtualVisibleStart = $derived(
    virtualScroll ? Math.max(0, Math.floor(scrollTop / virtualRowHeight) - overscan) : 0
  );
  let virtualVisibleEnd = $derived(
    virtualScroll
      ? Math.min(state.paginatedRows.length, Math.ceil((scrollTop + containerHeight) / virtualRowHeight) + overscan)
      : state.paginatedRows.length
  );
  let virtualTopPad = $derived(virtualScroll ? virtualVisibleStart * virtualRowHeight : 0);
  let virtualBottomPad = $derived(
    virtualScroll ? Math.max(0, (state.paginatedRows.length - virtualVisibleEnd) * virtualRowHeight) : 0
  );
  let virtualRows = $derived(
    virtualScroll
      ? state.paginatedRows.slice(virtualVisibleStart, virtualVisibleEnd)
      : state.paginatedRows
  );
</script>

<tbody class="sdt-tbody {classNames.tbody ?? ''}">
  {#if state.loading}
    <DataTableLoading text={loadingText} colSpan={visibleColCount} />
  {:else if state.paginatedRows.length === 0}
    <DataTableEmpty text={emptyText} colSpan={visibleColCount} />
  {:else if groupBy && groupedRows()}
    {#each groupedRows()! as group}
      <tr class="sdt-group-header">
        <td colspan={visibleColCount} class="sdt-group-cell">{group.key}</td>
      </tr>
      {#each group.rows as row, index (store.getRowId(row))}
        <DataTableRow
          {row}
          {index}
          {columns}
          {store}
          {selectable}
          {expandable}
          {editorMode}
          {rowClass}
          {classNames}
          {onRowClick}
          {customCell}
          {expandContent}
          {onExcelNavigate}
          {onExcelCommit}
          {onInlineCommit}
          {onBubbleAnchor}
        />
      {/each}
    {/each}
  {:else}
    {#if virtualScroll && virtualTopPad > 0}
      <tr style="height: {virtualTopPad}px;"><td colspan={visibleColCount}></td></tr>
    {/if}
    {#each virtualRows as row, i (store.getRowId(row))}
      {@const index = virtualScroll ? virtualVisibleStart + i : i}
      <DataTableRow
        {row}
        {index}
        {columns}
        {store}
        {selectable}
        {expandable}
        {editorMode}
        {rowClass}
        {classNames}
        {onRowClick}
        {customCell}
        {expandContent}
        {onExcelNavigate}
        {onExcelCommit}
        {onInlineCommit}
      />
    {/each}
    {#if virtualScroll && virtualBottomPad > 0}
      <tr style="height: {virtualBottomPad}px;"><td colspan={visibleColCount}></td></tr>
    {/if}
  {/if}
</tbody>

<style>
  .sdt-group-header {
    background: var(--sdt-group-bg, #f3f4f6);
  }
  .sdt-group-cell {
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--sdt-text-muted, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
  }
</style>
