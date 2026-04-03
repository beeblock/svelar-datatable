<script lang="ts">
  import type { ButtonDef, ExportFormat, DataTableStore, ColumnDef } from '../index.ts';
  import { ExportManager } from '../export/ExportManager.ts';

  interface Props {
    buttons: (ButtonDef | ExportFormat)[];
    store: DataTableStore;
    columns: ColumnDef[];
  }
  let { buttons, store, columns }: Props = $props();

  const exportManager = new ExportManager();

  const exportLabels: Record<ExportFormat, string> = {
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
    clipboard: 'Copy',
    print: 'Print',
  };

  function isExportFormat(btn: ButtonDef | ExportFormat): btn is ExportFormat {
    return typeof btn === 'string';
  }

  async function handleExport(format: ExportFormat) {
    const state = store.getState();
    const data = state.filteredRows;
    const visibleCols = columns.filter((c) => state.columnVisibility[c.key] !== false);
    await exportManager.export(format, data, visibleCols);
  }

  async function handleAction(btn: ButtonDef) {
    if (typeof btn.action === 'function') {
      const selected = store.getSelectedRows();
      const state = store.getState();
      await btn.action(selected, state.allRows);
    }
  }

  function isDisabled(btn: ButtonDef): boolean {
    if (typeof btn.disabled === 'function') {
      return btn.disabled(store.getSelectedRows());
    }
    return btn.disabled ?? false;
  }
</script>

<div class="sdt-buttons">
  {#each buttons as btn}
    {#if isExportFormat(btn)}
      <button type="button" class="sdt-btn sdt-btn-outline" onclick={() => handleExport(btn)}>
        {exportLabels[btn]}
      </button>
    {:else if btn.collection}
      <div class="sdt-btn-group">
        <button type="button" class="sdt-btn sdt-btn-{btn.variant ?? 'default'}" disabled={isDisabled(btn)}>
          {btn.label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="sdt-btn sdt-btn-{btn.variant ?? 'default'}"
        disabled={isDisabled(btn)}
        onclick={() => handleAction(btn)}
      >
        {btn.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .sdt-buttons {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }
  .sdt-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    border: 1px solid transparent;
  }
  .sdt-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .sdt-btn-default {
    background: var(--sdt-primary, #3b82f6);
    color: #fff;
  }
  .sdt-btn-default:hover:not(:disabled) {
    background: var(--sdt-primary-hover, #2563eb);
  }
  .sdt-btn-destructive {
    background: #ef4444;
    color: #fff;
  }
  .sdt-btn-destructive:hover:not(:disabled) {
    background: #dc2626;
  }
  .sdt-btn-outline {
    background: var(--sdt-input-bg, #fff);
    border-color: var(--sdt-border, #e5e7eb);
    color: var(--sdt-text, #111827);
  }
  .sdt-btn-outline:hover:not(:disabled) {
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-btn-secondary {
    background: var(--sdt-hover, #f3f4f6);
    color: var(--sdt-text, #111827);
  }
  .sdt-btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }
  .sdt-btn-ghost {
    background: transparent;
    color: var(--sdt-text, #111827);
  }
  .sdt-btn-ghost:hover:not(:disabled) {
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-btn-group {
    position: relative;
  }
</style>
