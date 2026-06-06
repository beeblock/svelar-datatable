<script lang="ts">
  import type { EditorFieldDef, DataTableStore, DataTableClassNames } from '../index.ts';
  import DataTableEditorForm from './DataTableEditorForm.svelte';

  interface Props {
    fields: EditorFieldDef[];
    store: DataTableStore;
    title?: string;
    classNames?: DataTableClassNames;
    onsubmit: (formData: Record<string, any>) => void | Promise<void>;
  }
  let { fields, store, title = 'Edit Record', classNames = {}, onsubmit }: Props = $props();

  // svelte-ignore state_referenced_locally

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let isOpen = $derived(state.editorMode === 'modal');
  let isCreate = $derived(state.editingRowId === null);

  function close() {
    store.closeEditor();
  }

  function handleBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('sdt-modal-backdrop')) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="sdt-modal-backdrop {classNames.editorBackdrop ?? ''}" onclick={handleBackdrop}>
    <div class="sdt-modal {classNames.editorModal ?? ''}" role="dialog" aria-modal="true">
      <div class="sdt-modal-header">
        <h3 class="sdt-modal-title">{isCreate ? 'Create Record' : title}</h3>
        <button type="button" class="sdt-modal-close" onclick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="sdt-modal-body">
        <DataTableEditorForm
          {fields}
          {store}
          {onsubmit}
          oncancel={close}
          submitLabel={isCreate ? 'Create' : 'Save'}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .sdt-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    animation: sdt-fade-in 0.15s ease;
  }
  .sdt-modal {
    background: var(--sdt-bg, #fff);
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 90%;
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: sdt-slide-up 0.2s ease;
  }
  .sdt-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
  }
  .sdt-modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--sdt-text, #111827);
  }
  .sdt-modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--sdt-text-muted, #6b7280);
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
  }
  .sdt-modal-close:hover {
    background: var(--sdt-hover, #f3f4f6);
    color: var(--sdt-text, #111827);
  }
  .sdt-modal-body {
    padding: 1.25rem;
    overflow-y: auto;
  }
  @keyframes sdt-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes sdt-slide-up {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
