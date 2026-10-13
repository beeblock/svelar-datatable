<script lang="ts">
  import type { ColumnDef, ButtonDef, ExportFormat, DataTableStore, EditorMode, DataTableClassNames } from '../index.ts';
  import DataTableSearch from './DataTableSearch.svelte';
  import DataTableColumnToggle from './DataTableColumnToggle.svelte';
  import DataTableButtons from './DataTableButtons.svelte';

  interface Props {
    store: DataTableStore;
    columns: ColumnDef[];
    searchable?: boolean;
    searchDebounceMs?: number;
    buttons?: (ButtonDef | ExportFormat)[];
    editorMode?: EditorMode;
    classNames?: DataTableClassNames;
    onCreateClick?: () => void;
    onEditClick?: (rows: any[]) => void;
    onDeleteClick?: (rows: any[]) => void;
  }
  let {
    store,
    columns,
    searchable = true,
    searchDebounceMs = 300,
    buttons,
    editorMode,
    classNames = {},
    onCreateClick,
    onEditClick,
    onDeleteClick,
  }: Props = $props();

  // svelte-ignore state_referenced_locally

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let selectedCount = $derived(state.selectedIds.size);

  function handleCreate() {
    if (onCreateClick) {
      onCreateClick();
    } else {
      // Create always uses modal — bubble/inline don't support create forms
      store.openEditor(null, null, 'modal');
    }
  }

  function handleEdit() {
    const selected = store.getSelectedRows();
    if (onEditClick) {
      onEditClick(selected);
    } else if (selected.length === 1) {
      const mode = editorMode === 'bubble' ? 'bubble' : 'modal';
      store.openEditor(store.getRowId(selected[0]), null, mode);
    }
  }

  function handleDelete() {
    const selected = store.getSelectedRows();
    if (onDeleteClick) {
      onDeleteClick(selected);
    }
  }
</script>

<div class="sdt-toolbar {classNames.toolbar ?? ''}">
  <div class="sdt-toolbar-left {classNames.toolbarLeft ?? ''}">
    {#if searchable}
      <DataTableSearch {store} debounceMs={searchDebounceMs} searchInputClass={classNames.searchInput} />
    {/if}
  </div>

  <div class="sdt-toolbar-right {classNames.toolbarRight ?? ''}">
    {#if editorMode && editorMode !== 'excel'}
      <button type="button" class="sdt-toolbar-btn sdt-toolbar-btn-create {classNames.btnCreate ?? ''}" onclick={handleCreate}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
      {#if selectedCount === 1}
        <button type="button" class="sdt-toolbar-btn sdt-toolbar-btn-edit {classNames.btnEdit ?? ''}" onclick={handleEdit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      {/if}
      {#if selectedCount > 0 && onDeleteClick}
        <button type="button" class="sdt-toolbar-btn sdt-toolbar-btn-delete {classNames.btnDelete ?? ''}" onclick={handleDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete ({selectedCount})
        </button>
      {/if}
    {/if}
    {#if buttons && buttons.length > 0}
      <DataTableButtons {buttons} {store} {columns} />
    {/if}
    <DataTableColumnToggle {store} {columns} />
  </div>
</div>

<style>
  .sdt-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .sdt-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }
  .sdt-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex-shrink: 1;
    min-width: 0;
    max-width: 100%;
  }
  .sdt-toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.15s;
  }
  .sdt-toolbar-btn-create {
    background: var(--sdt-primary, #3b82f6);
    color: #fff;
  }
  .sdt-toolbar-btn-create:hover {
    background: var(--sdt-primary-hover, #2563eb);
  }
  .sdt-toolbar-btn-edit {
    background: var(--sdt-input-bg, #fff);
    border-color: var(--sdt-border, #e5e7eb);
    color: var(--sdt-text, #111827);
  }
  .sdt-toolbar-btn-edit:hover {
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-toolbar-btn-delete {
    background: #ef4444;
    color: #fff;
  }
  .sdt-toolbar-btn-delete:hover {
    background: #dc2626;
  }
</style>
