<script lang="ts">
  import type { EditorFieldDef, DataTableStore, DataTableClassNames } from '../index.js';
  import DataTableModalEditor from './DataTableModalEditor.svelte';
  import DataTableBubbleEditor from './DataTableBubbleEditor.svelte';

  interface Props {
    fields: EditorFieldDef[];
    store: DataTableStore;
    classNames?: DataTableClassNames;
    onsubmit: (formData: Record<string, any>) => void | Promise<void>;
    anchorEl?: HTMLElement | null;
  }
  let { fields, store, classNames = {}, onsubmit, anchorEl = null }: Props = $props();

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });
</script>

{#if state.editorMode === 'modal'}
  <DataTableModalEditor {fields} {store} {onsubmit} {classNames} />
{:else if state.editorMode === 'bubble'}
  <DataTableBubbleEditor {fields} {store} {onsubmit} {anchorEl} {classNames} />
{/if}
