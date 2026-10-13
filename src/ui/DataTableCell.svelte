<script lang="ts">
  import type { ColumnDef, DataTableStore } from '../index.ts';
  import type { Snippet } from 'svelte';

  interface Props {
    row: any;
    rowIndex: number;
    column: ColumnDef;
    store: DataTableStore;
    editorMode?: string | null;
    customCell?: Snippet<[{ row: any; column: ColumnDef; value: any }]>;
    onExcelNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onExcelCommit?: () => void;
    onInlineCommit?: (row: any, columnKey: string, newValue: any, oldValue: any) => void;
    tdClass?: string;
  }
  let {
    row, rowIndex, column, store, editorMode = null, customCell,
    onExcelNavigate, onExcelCommit, onInlineCommit, tdClass = '',
  }: Props = $props();

  let value = $derived(row[column.key]);

  // svelte-ignore state_referenced_locally

  let tableState = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      tableState = store.getState();
    });
  });

  let isExcelMode = $derived(editorMode === 'excel');
  let isFocused = $derived(
    isExcelMode
    && tableState.excelFocusedCell?.rowIndex === rowIndex
    && tableState.excelFocusedCell?.columnKey === column.key
  );
  let isEditing = $derived(
    isExcelMode
    && tableState.excelEditingCell?.rowIndex === rowIndex
    && tableState.excelEditingCell?.columnKey === column.key
  );

  // Inline editor tableState
  let isInlineEditing = $derived(
    editorMode === 'inline'
    && tableState.editorMode === 'inline'
    && tableState.editingRowId === store.getRowId(row)
    && tableState.editingColumn === column.key
  );
  let inlineValue = $state('');

  $effect(() => {
    if (isInlineEditing) {
      inlineValue = value != null ? String(value) : '';
    }
  });

  let cellEl: HTMLTableCellElement | undefined = $state();
  let inputEl: HTMLInputElement | HTMLSelectElement | undefined = $state();

  let inlineInputEl: HTMLInputElement | HTMLSelectElement | undefined = $state();

  // Auto-focus input when entering edit mode (excel or inline)
  $effect(() => {
    if (isEditing && inputEl) {
      inputEl.focus();
      if (inputEl instanceof HTMLInputElement) {
        inputEl.select();
      }
    }
  });

  $effect(() => {
    if (isInlineEditing && inlineInputEl) {
      inlineInputEl.focus();
      if (inlineInputEl instanceof HTMLInputElement) {
        inlineInputEl.select();
      }
    }
  });

  function commitInlineEdit() {
    if (!isInlineEditing) return;
    const col = column;
    const oldVal = value;
    let newVal: any = inlineValue;
    if (col.type === 'number') newVal = newVal === '' ? null : Number(newVal);
    else if (col.type === 'boolean') newVal = newVal === 'true' || newVal === '1';
    else if (newVal === '') newVal = null;

    store.closeEditor();
    if (newVal !== oldVal) {
      onInlineCommit?.(row, col.key, newVal, oldVal);
    }
  }

  function cancelInlineEdit() {
    store.closeEditor();
  }

  function handleInlineKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInlineEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEdit();
    }
  }

  function formatValue(val: any, type?: string): string {
    if (val === null || val === undefined) return '';
    if (type === 'boolean') return val ? 'Yes' : 'No';
    if (type === 'date' && val) {
      try { return new Date(val).toLocaleDateString(); } catch { return String(val); }
    }
    if (type === 'number') return String(val);
    return String(val);
  }

  function handleDblClick() {
    if (column.editable && editorMode === 'inline') {
      store.openEditor(store.getRowId(row), column.key, 'inline');
    }
  }

  function handleCellClick() {
    if (isExcelMode && column.editable !== false) {
      store.focusCell(rowIndex, column.key);
    }
  }

  function handleCellKeydown(e: KeyboardEvent) {
    if (!isExcelMode || !isFocused) return;

    if (isEditing) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          onExcelCommit?.();
          break;
        case 'Escape':
          e.preventDefault();
          store.cancelCellEdit();
          cellEl?.focus();
          break;
        case 'Tab':
          e.preventDefault();
          onExcelCommit?.();
          onExcelNavigate?.(e.shiftKey ? 'left' : 'right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          onExcelCommit?.();
          onExcelNavigate?.('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onExcelCommit?.();
          onExcelNavigate?.('down');
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          // Allow cursor movement inside text inputs
          break;
      }
      return;
    }

    // While focused (not editing)
    switch (e.key) {
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (column.editable !== false) {
          store.startCellEdit();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        onExcelNavigate?.('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onExcelNavigate?.('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onExcelNavigate?.('left');
        break;
      case 'ArrowRight':
      case 'Tab':
        e.preventDefault();
        onExcelNavigate?.(e.shiftKey ? 'left' : 'right');
        break;
      case 'Escape':
        e.preventDefault();
        store.clearExcelFocus();
        break;
      default:
        // Typing a character starts editing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && column.editable !== false) {
          store.startCellEdit();
          // Let the character through to the input
          store.setExcelEditValue(e.key);
        }
        break;
    }
  }

  function handleInputKeydown(e: KeyboardEvent) {
    // Handle editing keys once; the containing cell also has a keyboard handler.
    e.stopPropagation();
    // For select/boolean: left/right arrows also commit+navigate (no cursor to move)
    if (column.type === 'boolean' || column.editorField?.type === 'select') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        onExcelCommit?.();
        onExcelNavigate?.(e.key === 'ArrowLeft' ? 'left' : 'right');
        return;
      }
    }
    handleCellKeydown(e);
  }

  // Auto-focus cell element when it becomes focused in excel mode
  $effect(() => {
    if (isFocused && !isEditing && cellEl) {
      cellEl.focus();
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<td
  bind:this={cellEl}
  class="sdt-cell {column.className ?? ''} {tdClass}"
  class:sdt-cell-editable={column.editable !== false}
  class:sdt-excel-focused={isFocused && !isEditing}
  class:sdt-excel-editing={isEditing}
  style:width={column.width}
  style:min-width={column.minWidth}
  style:max-width={column.maxWidth}
  ondblclick={handleDblClick}
  onclick={handleCellClick}
  onkeydown={handleCellKeydown}
  tabindex={isExcelMode && column.editable !== false ? 0 : undefined}
>
  {#if isInlineEditing}
    {#if column.type === 'boolean'}
      <select
        bind:this={inlineInputEl}
        class="sdt-inline-input"
        value={inlineValue}
        onchange={(e) => { inlineValue = e.currentTarget.value; commitInlineEdit(); }}
        onkeydown={handleInlineKeydown}
        onblur={commitInlineEdit}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    {:else if column.editorField?.type === 'select' && column.editorField.options}
      <select
        bind:this={inlineInputEl}
        class="sdt-inline-input"
        value={inlineValue}
        onchange={(e) => { inlineValue = e.currentTarget.value; commitInlineEdit(); }}
        onkeydown={handleInlineKeydown}
        onblur={commitInlineEdit}
      >
        {#each column.editorField.options as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    {:else}
      <input
        bind:this={inlineInputEl}
        class="sdt-inline-input"
        type={column.type === 'number' ? 'number' : 'text'}
        bind:value={inlineValue}
        onkeydown={handleInlineKeydown}
        onblur={commitInlineEdit}
      />
    {/if}
  {:else if isEditing}
    {#if column.type === 'boolean'}
      <select
        bind:this={inputEl}
        class="sdt-excel-input"
        value={tableState.excelEditValue}
        onchange={(e) => store.setExcelEditValue(e.currentTarget.value)}
        onkeydown={handleInputKeydown}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    {:else if column.editorField?.type === 'select' && column.editorField.options}
      <select
        bind:this={inputEl}
        class="sdt-excel-input"
        value={tableState.excelEditValue}
        onchange={(e) => store.setExcelEditValue(e.currentTarget.value)}
        onkeydown={handleInputKeydown}
      >
        {#each column.editorField.options as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    {:else}
      <input
        bind:this={inputEl}
        class="sdt-excel-input"
        type={column.type === 'number' ? 'number' : 'text'}
        value={tableState.excelEditValue}
        oninput={(e) => store.setExcelEditValue(e.currentTarget.value)}
        onkeydown={handleInputKeydown}
      />
    {/if}
  {:else if customCell}
    {@render customCell({ row, column, value })}
  {:else if column.type === 'html'}
    {@html value}
  {:else}
    {formatValue(value, column.type)}
  {/if}
</td>

<style>
  .sdt-cell {
    padding: var(--sdt-cell-padding, 0.625rem 0.75rem);
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sdt-cell-editable {
    cursor: pointer;
  }
  .sdt-cell-editable:hover {
    background-color: var(--sdt-cell-edit-hover, rgba(59, 130, 246, 0.05));
  }
  .sdt-excel-focused {
    outline: 2px solid var(--sdt-primary, #3b82f6);
    outline-offset: -2px;
    background-color: var(--sdt-excel-focus-bg, rgba(59, 130, 246, 0.06));
  }
  .sdt-excel-editing {
    padding: 0.125rem;
    background-color: var(--sdt-excel-edit-bg, #fff);
    outline: 2px solid var(--sdt-primary, #3b82f6);
    outline-offset: -2px;
  }
  .sdt-excel-input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.875rem;
    font-family: inherit;
    padding: 0.375rem 0.5rem;
    box-sizing: border-box;
  }
  .sdt-excel-input:focus {
    outline: none;
  }
  .sdt-inline-input {
    width: 100%;
    border: 1px solid var(--sdt-primary, #3b82f6);
    border-radius: 0.25rem;
    outline: none;
    background: var(--sdt-bg, #fff);
    font-size: 0.875rem;
    font-family: inherit;
    padding: 0.25rem 0.375rem;
    box-sizing: border-box;
  }
  .sdt-inline-input:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
</style>
