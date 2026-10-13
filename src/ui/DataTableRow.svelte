<script lang="ts">
  import type { ColumnDef, DataTableStore, SelectionMode, EditorMode, DataTableClassNames } from '../index.ts';
  import type { Snippet } from 'svelte';
  import DataTableCell from './DataTableCell.svelte';
  import DataTableExpandedRow from './DataTableExpandedRow.svelte';

  interface Props {
    row: any;
    index: number;
    columns: ColumnDef[];
    store: DataTableStore;
    selectable?: SelectionMode;
    expandable?: boolean;
    editorMode?: EditorMode;
    rowClass?: string | ((row: any, index: number) => string);
    onRowClick?: (row: any, event: MouseEvent) => void;
    customCell?: Snippet<[{ row: any; column: ColumnDef; value: any }]>;
    expandContent?: Snippet<[{ row: any }]>;
    onExcelNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onExcelCommit?: () => void;
    onInlineCommit?: (row: any, columnKey: string, newValue: any, oldValue: any) => void;
    onBubbleAnchor?: (el: HTMLElement) => void;
    classNames?: DataTableClassNames;
  }
  let {
    row,
    index,
    columns,
    store,
    selectable = 'none',
    expandable = false,
    editorMode,
    rowClass,
    onRowClick,
    customCell,
    expandContent,
    onExcelNavigate,
    onExcelCommit,
    onInlineCommit,
    onBubbleAnchor,
    classNames = {},
  }: Props = $props();

  // svelte-ignore state_referenced_locally

  let tableState = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      tableState = store.getState();
    });
  });

  let rowId = $derived(store.getRowId(row));
  let isSelected = $derived(tableState.selectedIds.has(rowId));
  let expanded = $state(false);

  let visibleColumns = $derived(
    tableState.columnOrder
      .filter((key) => tableState.columnVisibility[key] !== false)
      .map((key) => columns.find((c) => c.key === key))
      .filter(Boolean) as ColumnDef[]
  );

  let computedClass = $derived(() => {
    if (!rowClass) return '';
    if (typeof rowClass === 'function') return rowClass(row, index);
    return rowClass;
  });

  let totalCols = $derived(
    visibleColumns.length + (selectable !== 'none' ? 1 : 0) + (expandable ? 1 : 0)
  );

  function handleClick(e: MouseEvent) {
    if (selectable === 'multi') {
      const lastId = store.getLastSelectedId();
      if (e.shiftKey && lastId !== null) {
        store.selectRange(lastId, rowId);
      } else {
        store.toggleSelect(rowId);
      }
    } else if (selectable === 'single') {
      if (isSelected) {
        store.deselectAll();
      } else {
        store.selectSingle(rowId);
      }
    }
    onRowClick?.(row, e);
  }

  function toggleExpand(e: Event) {
    e.stopPropagation();
    expanded = !expanded;
  }

  let trEl: HTMLTableRowElement | undefined = $state();

  // Report this row element as the bubble anchor when it becomes the editing row
  $effect(() => {
    if (trEl && tableState.editingRowId === rowId && tableState.editorMode === 'bubble') {
      onBubbleAnchor?.(trEl);
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<tr
  bind:this={trEl}
  class="sdt-row {computedClass()} {classNames.tr ?? ''} {isSelected ? classNames.trSelected ?? '' : ''} {index % 2 === 1 ? classNames.trEven ?? '' : ''}"
  class:sdt-row-selected={isSelected}
  class:sdt-row-even={index % 2 === 1}
  onclick={handleClick}
>
  {#if selectable === 'multi'}
    <td class="sdt-cell sdt-cell-checkbox {classNames.td ?? ''}">
      <input
        type="checkbox"
        checked={isSelected}
        onclick={(e) => e.stopPropagation()}
        onchange={(e) => {
          e.stopPropagation();
          store.toggleSelect(rowId);
        }}
      />
    </td>
  {:else if selectable === 'single'}
    <td class="sdt-cell sdt-cell-checkbox {classNames.td ?? ''}">
      <input
        type="radio"
        checked={isSelected}
        name="sdt-select"
        onclick={(e) => e.stopPropagation()}
        onchange={(e) => {
          e.stopPropagation();
          store.selectSingle(rowId);
        }}
      />
    </td>
  {/if}

  {#if expandable}
    <td class="sdt-cell sdt-cell-expand {classNames.td ?? ''}">
      <button type="button" class="sdt-expand-btn" onclick={toggleExpand} aria-label="Expand row">
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"
          class="sdt-expand-icon"
          class:sdt-expanded={expanded}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </td>
  {/if}

  {#each visibleColumns as col}
    <DataTableCell {row} rowIndex={index} column={col} {store} editorMode={editorMode ?? null} {customCell} {onExcelNavigate} {onExcelCommit} {onInlineCommit} tdClass={classNames.td} />
  {/each}
</tr>

{#if expandable && expanded}
  <DataTableExpandedRow {row} colSpan={totalCols} {expandContent} />
{/if}

<style>
  .sdt-row {
    transition: background-color 0.1s;
  }
  .sdt-row:hover {
    background-color: var(--sdt-row-hover, #f9fafb);
  }
  .sdt-row-selected {
    background-color: var(--sdt-row-selected, rgba(59, 130, 246, 0.08)) !important;
  }
  .sdt-row-even {
    background-color: var(--sdt-row-stripe, transparent);
  }
  .sdt-cell-checkbox {
    text-align: center;
    width: 40px;
    padding: var(--sdt-cell-padding, 0.625rem 0.75rem);
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
  }
  .sdt-cell-checkbox input {
    accent-color: var(--sdt-primary, #3b82f6);
  }
  .sdt-cell-expand {
    width: 32px;
    padding: var(--sdt-cell-padding, 0.625rem 0.5rem);
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
  }
  .sdt-expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.125rem;
    display: flex;
    color: var(--sdt-text-muted, #6b7280);
    border-radius: 0.25rem;
  }
  .sdt-expand-btn:hover {
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-expand-icon {
    transition: transform 0.15s;
  }
  .sdt-expanded {
    transform: rotate(90deg);
  }
</style>
