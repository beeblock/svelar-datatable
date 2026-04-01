<script lang="ts">
  import type { ColumnDef, DataTableStore, SelectionMode, DataTableClassNames } from '../index.js';

  interface Props {
    columns: ColumnDef[];
    store: DataTableStore;
    selectable?: SelectionMode;
    expandable?: boolean;
    classNames?: DataTableClassNames;
  }
  let { columns, store, selectable = 'none', expandable = false, classNames = {} }: Props = $props();

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

  let hasFooter = $derived(visibleColumns.some((c) => c.footer !== undefined));

  function getFooterValue(col: ColumnDef): string {
    if (!col.footer) return '';
    if (typeof col.footer === 'function') {
      return String(col.footer(state.filteredRows));
    }
    return col.footer;
  }
</script>

{#if hasFooter}
  <tfoot class="sdt-tfoot {classNames.tfoot ?? ''}">
    <tr>
      {#if selectable !== 'none'}
        <td class="sdt-tf {classNames.tf ?? ''}"></td>
      {/if}
      {#if expandable}
        <td class="sdt-tf {classNames.tf ?? ''}"></td>
      {/if}
      {#each visibleColumns as col}
        <td class="sdt-tf {classNames.tf ?? ''}">{getFooterValue(col)}</td>
      {/each}
    </tr>
  </tfoot>
{/if}

<style>
  .sdt-tfoot {
    background: var(--sdt-head-bg, #f9fafb);
  }
  .sdt-tf {
    padding: var(--sdt-cell-padding, 0.625rem 0.75rem);
    border-top: 2px solid var(--sdt-border, #e5e7eb);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sdt-text, #111827);
  }
</style>
