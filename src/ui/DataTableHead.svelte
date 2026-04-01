<script lang="ts">
  import type { ColumnDef, DataTableStore, SelectionMode, DataTableClassNames } from '../index.js';

  interface Props {
    columns: ColumnDef[];
    store: DataTableStore;
    selectable?: SelectionMode;
    sortable?: boolean;
    expandable?: boolean;
    classNames?: DataTableClassNames;
  }
  let { columns, store, selectable = 'none', sortable = true, expandable = false, classNames = {} }: Props = $props();

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let visibleColumns = $derived(
    state.columnOrder
      .filter((key) => state.columnVisibility[key] !== false)
      .map((key) => columns.find((c) => c.key === key))
      .filter(Boolean) as ColumnDef[]
  );

  let allSelected = $derived(() => {
    if (state.filteredRows.length === 0) return false;
    return state.filteredRows.every((r) => state.selectedIds.has(store.getRowId(r)));
  });

  function getSortDirection(key: string): 'asc' | 'desc' | null {
    const s = state.sort.find((s) => s.column === key);
    return s?.direction ?? null;
  }

  function getSortIndex(key: string): number {
    if (state.sort.length <= 1) return -1;
    return state.sort.findIndex((s) => s.column === key);
  }

  function handleSort(col: ColumnDef, e: MouseEvent) {
    if (!sortable || col.sortable === false) return;
    store.toggleSort(col.key, e.shiftKey);
  }

  function handleSelectAll() {
    if (allSelected()) {
      store.deselectAll();
    } else {
      store.selectAll();
    }
  }
</script>

<thead class="sdt-thead {classNames.thead ?? ''}">
  <tr>
    {#if selectable === 'multi'}
      <th class="sdt-th sdt-th-checkbox {classNames.th ?? ''}" style="width: 40px;">
        <input
          type="checkbox"
          checked={allSelected()}
          onchange={handleSelectAll}
          aria-label="Select all"
        />
      </th>
    {:else if selectable === 'single'}
      <th class="sdt-th sdt-th-checkbox {classNames.th ?? ''}" style="width: 40px;"></th>
    {/if}

    {#if expandable}
      <th class="sdt-th sdt-th-expand {classNames.th ?? ''}" style="width: 32px;"></th>
    {/if}

    {#each visibleColumns as col}
      <th
        class="sdt-th {col.headerClassName ?? ''} {classNames.th ?? ''}"
        class:sdt-th-sortable={sortable && col.sortable !== false}
        style:width={col.width}
        style:min-width={col.minWidth}
        style:max-width={col.maxWidth}
      >
        {#if sortable && col.sortable !== false}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="sdt-th-sort" onclick={(e) => handleSort(col, e)}>
            <span>{col.header}</span>
            <span class="sdt-sort-indicator">
              {#if getSortDirection(col.key) === 'asc'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              {:else if getSortDirection(col.key) === 'desc'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="sdt-sort-idle">
                  <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
                </svg>
              {/if}
              {#if getSortIndex(col.key) >= 0}
                <span class="sdt-sort-index">{getSortIndex(col.key) + 1}</span>
              {/if}
            </span>
          </div>
        {:else}
          <span>{col.header}</span>
        {/if}
      </th>
    {/each}
  </tr>
</thead>

<style>
  .sdt-thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--sdt-head-bg, #f9fafb);
  }
  .sdt-th {
    padding: var(--sdt-cell-padding, 0.625rem 0.75rem);
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sdt-text-muted, #6b7280);
    border-bottom: 2px solid var(--sdt-border, #e5e7eb);
    white-space: nowrap;
    user-select: none;
  }
  .sdt-th-expand {
    padding: var(--sdt-cell-padding, 0.625rem 0.5rem);
  }
  .sdt-th-checkbox {
    text-align: center;
  }
  .sdt-th-checkbox input {
    accent-color: var(--sdt-primary, #3b82f6);
  }
  .sdt-th-sortable {
    cursor: pointer;
  }
  .sdt-th-sortable:hover {
    color: var(--sdt-text, #111827);
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-th-sort {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .sdt-sort-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
  }
  .sdt-sort-idle {
    opacity: 0.3;
  }
  .sdt-sort-index {
    font-size: 0.625rem;
    color: var(--sdt-primary, #3b82f6);
    font-weight: 700;
  }
</style>
