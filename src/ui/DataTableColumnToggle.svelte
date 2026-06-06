<script lang="ts">
  import type { ColumnDef, DataTableStore } from '../index.ts';

  interface Props {
    store: DataTableStore;
    columns: ColumnDef[];
  }
  let { store, columns }: Props = $props();

  let open = $state(false);
  // svelte-ignore state_referenced_locally
  let state = $state(store.getState());

  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  function toggle(key: string) {
    store.toggleColumnVisibility(key);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.sdt-col-toggle')) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="sdt-col-toggle">
  <button type="button" class="sdt-col-toggle-btn" onclick={() => (open = !open)} aria-label="Toggle columns">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M12 3v18M3 12h18M9 3h6M9 21h6M3 9v6M21 9v6" />
    </svg>
    Columns
  </button>

  {#if open}
    <div class="sdt-col-toggle-menu">
      {#each columns as col}
        <label class="sdt-col-toggle-item">
          <input
            type="checkbox"
            checked={state.columnVisibility[col.key] !== false}
            onchange={() => toggle(col.key)}
          />
          <span>{col.header}</span>
        </label>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sdt-col-toggle {
    position: relative;
  }
  .sdt-col-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.375rem;
    background: var(--sdt-input-bg, #fff);
    color: var(--sdt-text, #111827);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .sdt-col-toggle-btn:hover {
    background-color: var(--sdt-hover, #f3f4f6);
  }
  .sdt-col-toggle-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    min-width: 180px;
    padding: 0.5rem;
    background: var(--sdt-bg, #fff);
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20;
  }
  .sdt-col-toggle-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    border-radius: 0.25rem;
    cursor: pointer;
    color: var(--sdt-text, #111827);
  }
  .sdt-col-toggle-item:hover {
    background-color: var(--sdt-hover, #f3f4f6);
  }
  .sdt-col-toggle-item input {
    accent-color: var(--sdt-primary, #3b82f6);
  }
</style>
