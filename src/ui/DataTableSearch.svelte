<script lang="ts">
  import type { DataTableStore } from '../index.ts';

  interface Props {
    store: DataTableStore;
    debounceMs?: number;
    placeholder?: string;
    searchInputClass?: string;
  }
  let { store, debounceMs = 300, placeholder = 'Search...', searchInputClass = '' }: Props = $props();

  let inputValue = $state(store.getState().globalSearch);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    inputValue = val;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      store.setGlobalSearch(val);
    }, debounceMs);
  }

  function handleClear() {
    inputValue = '';
    store.setGlobalSearch('');
  }
</script>

<div class="sdt-search">
  <svg class="sdt-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
  <input
    type="text"
    class="sdt-search-input {searchInputClass}"
    value={inputValue}
    oninput={handleInput}
    {placeholder}
  />
  {#if inputValue}
    <button type="button" class="sdt-search-clear" onclick={handleClear} aria-label="Clear search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .sdt-search {
    position: relative;
    display: flex;
    align-items: center;
  }
  .sdt-search-icon {
    position: absolute;
    left: 0.625rem;
    width: 1rem;
    height: 1rem;
    color: var(--sdt-text-muted, #6b7280);
    pointer-events: none;
  }
  .sdt-search-input {
    padding: 0.5rem 2rem 0.5rem 2.25rem;
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: var(--sdt-input-bg, #fff);
    color: var(--sdt-text, #111827);
    outline: none;
    width: 100%;
    max-width: 280px;
    transition: border-color 0.15s;
  }
  .sdt-search-input:focus {
    border-color: var(--sdt-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--sdt-primary-ring, rgba(59, 130, 246, 0.2));
  }
  .sdt-search-clear {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--sdt-text-muted, #6b7280);
    padding: 2px;
    display: flex;
    align-items: center;
  }
  .sdt-search-clear:hover {
    color: var(--sdt-text, #111827);
  }
</style>
