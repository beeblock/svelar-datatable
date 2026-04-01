<script lang="ts">
  import type { EditorFieldDef, DataTableStore, DataTableClassNames } from '../index.js';
  import DataTableEditorForm from './DataTableEditorForm.svelte';
  import { tick } from 'svelte';

  interface Props {
    fields: EditorFieldDef[];
    store: DataTableStore;
    anchorEl?: HTMLElement | null;
    classNames?: DataTableClassNames;
    onsubmit: (formData: Record<string, any>) => void | Promise<void>;
  }
  let { fields, store, anchorEl = null, classNames = {}, onsubmit }: Props = $props();

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let isOpen = $derived(state.editorMode === 'bubble');
  let popoverStyle = $state('');

  // Get only the field for the column being edited
  let activeFields = $derived(() => {
    if (state.editingColumn) {
      const field = fields.find((f) => f.name === state.editingColumn);
      return field ? [field] : fields;
    }
    return fields;
  });

  // Position the bubble editor relative to the editing row
  $effect(() => {
    if (!isOpen) return;

    // Use anchorEl if provided, otherwise find the selected row in the DOM
    async function position() {
      await tick();
      let el = anchorEl;
      if (!el) {
        el = document.querySelector('.sdt-row-selected') as HTMLElement | null;
      }
      if (el) {
        const rect = el.getBoundingClientRect();
        popoverStyle = `top: ${rect.bottom + 4}px; left: ${rect.left}px;`;
      }
    }
    position();
  });

  function close() {
    store.closeEditor();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sdt-bubble-backdrop" onclick={close}></div>
  <div class="sdt-bubble-editor" style={popoverStyle}>
    <DataTableEditorForm
      fields={activeFields()}
      {store}
      {onsubmit}
      oncancel={close}
    />
  </div>
{/if}

<style>
  .sdt-bubble-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .sdt-bubble-editor {
    position: fixed;
    z-index: 41;
    background: var(--sdt-bg, #fff);
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    min-width: 220px;
    max-width: 320px;
    animation: sdt-pop-in 0.15s ease;
  }
  @keyframes sdt-pop-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
