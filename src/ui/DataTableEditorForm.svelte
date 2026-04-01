<script lang="ts">
  import type { EditorFieldDef, DataTableStore } from '../index.js';
  import DataTableEditorField from './DataTableEditorField.svelte';

  interface Props {
    fields: EditorFieldDef[];
    store: DataTableStore;
    onsubmit: (formData: Record<string, any>) => void | Promise<void>;
    oncancel: () => void;
    submitLabel?: string;
  }
  let { fields, store, onsubmit, oncancel, submitLabel = 'Save' }: Props = $props();

  let submitting = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitting = true;
    try {
      const state = store.getState();
      await onsubmit(state.formData);
    } finally {
      submitting = false;
    }
  }
</script>

<form class="sdt-editor-form" onsubmit={handleSubmit}>
  <div class="sdt-editor-fields">
    {#each fields as field}
      <DataTableEditorField {field} {store} />
    {/each}
  </div>

  <div class="sdt-editor-actions">
    <button type="button" class="sdt-btn sdt-btn-cancel" onclick={oncancel} disabled={submitting}>
      Cancel
    </button>
    <button type="submit" class="sdt-btn sdt-btn-submit" disabled={submitting}>
      {#if submitting}
        Saving...
      {:else}
        {submitLabel}
      {/if}
    </button>
  </div>
</form>

<style>
  .sdt-editor-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sdt-editor-fields {
    display: flex;
    flex-direction: column;
  }
  .sdt-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--sdt-border, #e5e7eb);
  }
  .sdt-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.15s;
  }
  .sdt-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sdt-btn-cancel {
    background: var(--sdt-input-bg, #fff);
    border-color: var(--sdt-border, #e5e7eb);
    color: var(--sdt-text, #111827);
  }
  .sdt-btn-cancel:hover:not(:disabled) {
    background: var(--sdt-hover, #f3f4f6);
  }
  .sdt-btn-submit {
    background: var(--sdt-primary, #3b82f6);
    color: #fff;
  }
  .sdt-btn-submit:hover:not(:disabled) {
    background: var(--sdt-primary-hover, #2563eb);
  }
</style>
