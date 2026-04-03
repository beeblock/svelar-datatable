<script lang="ts">
  import type { DataTableStore, DataTableClassNames } from '../index.ts';

  interface Props {
    store: DataTableStore;
    perPageOptions?: number[];
    classNames?: DataTableClassNames;
  }
  let { store, perPageOptions = [10, 15, 25, 50, 100], classNames = {} }: Props = $props();

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let pagination = $derived(state.pagination);
  let from = $derived(pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1);
  let to = $derived(Math.min(pagination.page * pagination.perPage, pagination.total));

  // Generate page numbers with ellipsis
  let pages = $derived(() => {
    const total = pagination.lastPage;
    const current = pagination.page;
    const result: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) result.push(i);
    } else {
      result.push(1);
      if (current > 3) result.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) result.push(i);
      if (current < total - 2) result.push('...');
      result.push(total);
    }
    return result;
  });

  function setPage(p: number) {
    store.setPage(p);
  }

  function handlePerPage(e: Event) {
    store.setPerPage(Number((e.target as HTMLSelectElement).value));
  }
</script>

<div class="sdt-pagination {classNames.pagination ?? ''}">
  <div class="sdt-pagination-info {classNames.paginationInfo ?? ''}">
    <span class="sdt-pagination-showing">
      Showing {from} to {to} of {pagination.total}
    </span>
    <label class="sdt-per-page">
      <select value={pagination.perPage} onchange={handlePerPage} class="sdt-per-page-select {classNames.perPageSelect ?? ''}">
        {#each perPageOptions as opt}
          <option value={opt}>{opt}</option>
        {/each}
      </select>
      per page
    </label>
  </div>

  <div class="sdt-pagination-controls {classNames.paginationControls ?? ''}">
    <button
      type="button"
      class="sdt-page-btn {classNames.pageButton ?? ''}"
      disabled={pagination.page <= 1}
      onclick={() => setPage(1)}
      aria-label="First page"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
      </svg>
    </button>
    <button
      type="button"
      class="sdt-page-btn {classNames.pageButton ?? ''}"
      disabled={pagination.page <= 1}
      onclick={() => setPage(pagination.page - 1)}
      aria-label="Previous page"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>

    {#each pages() as p}
      {#if p === '...'}
        <span class="sdt-page-ellipsis">...</span>
      {:else}
        <button
          type="button"
          class="sdt-page-btn {classNames.pageButton ?? ''}"
          class:sdt-page-active={p === pagination.page}
          onclick={() => setPage(p)}
        >
          {p}
        </button>
      {/if}
    {/each}

    <button
      type="button"
      class="sdt-page-btn {classNames.pageButton ?? ''}"
      disabled={pagination.page >= pagination.lastPage}
      onclick={() => setPage(pagination.page + 1)}
      aria-label="Next page"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
    <button
      type="button"
      class="sdt-page-btn {classNames.pageButton ?? ''}"
      disabled={pagination.page >= pagination.lastPage}
      onclick={() => setPage(pagination.lastPage)}
      aria-label="Last page"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />
      </svg>
    </button>
  </div>
</div>

<style>
  .sdt-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--sdt-border, #e5e7eb);
    font-size: 0.8125rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .sdt-pagination-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--sdt-text-muted, #6b7280);
  }
  .sdt-per-page {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--sdt-text-muted, #6b7280);
    cursor: pointer;
  }
  .sdt-per-page-select {
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.25rem;
    background: var(--sdt-input-bg, #fff);
    color: var(--sdt-text, #111827);
    font-size: 0.8125rem;
    cursor: pointer;
  }
  .sdt-pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }
  .sdt-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.375rem;
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.25rem;
    background: var(--sdt-input-bg, #fff);
    color: var(--sdt-text, #111827);
    cursor: pointer;
    font-size: 0.8125rem;
    transition: background-color 0.15s, border-color 0.15s;
  }
  .sdt-page-btn:hover:not(:disabled) {
    background-color: var(--sdt-hover, #f3f4f6);
  }
  .sdt-page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .sdt-page-active {
    background-color: var(--sdt-primary, #3b82f6);
    border-color: var(--sdt-primary, #3b82f6);
    color: #fff;
  }
  .sdt-page-active:hover:not(:disabled) {
    background-color: var(--sdt-primary, #3b82f6);
  }
  .sdt-page-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    color: var(--sdt-text-muted, #6b7280);
  }
</style>
