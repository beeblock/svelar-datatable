import { describe, expect, it } from 'vitest';
import { DataTableStore } from '../src/state/DataTableStore.js';

describe('DataTableStore', () => {
  it('filters, sorts, paginates, and selects rows', () => {
    const store = new DataTableStore({
      data: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'member' },
        { id: 3, name: 'Charlie', role: 'member' },
      ],
      columns: [
        { key: 'name', header: 'Name', searchable: true, sortable: true },
        { key: 'role', header: 'Role', searchable: true, sortable: true },
      ],
      perPage: 1,
    });

    expect(store.getState().pagination.total).toBe(3);
    expect(store.getState().paginatedRows).toEqual([{ id: 1, name: 'Alice', role: 'admin' }]);

    store.setGlobalSearch('member');
    expect(store.getState().pagination.total).toBe(2);
    expect(store.getState().paginatedRows).toEqual([{ id: 2, name: 'Bob', role: 'member' }]);

    store.setSort([{ column: 'name', direction: 'desc' }]);
    expect(store.getState().paginatedRows).toEqual([{ id: 3, name: 'Charlie', role: 'member' }]);

    store.toggleSelect(3);
    expect(store.getSelectedRows()).toEqual([{ id: 3, name: 'Charlie', role: 'member' }]);
  });

  it('stores server responses without local recompute', () => {
    const store = new DataTableStore({
      data: [],
      columns: [{ key: 'name', header: 'Name' }],
      perPage: 2,
    });

    store.setLoading(true);
    store.setServerResponse({
      draw: 4,
      recordsTotal: 10,
      recordsFiltered: 5,
      data: [{ id: 10, name: 'Remote row' }],
    });

    expect(store.getState()).toEqual(expect.objectContaining({
      loading: false,
      draw: 4,
      allRows: [{ id: 10, name: 'Remote row' }],
      paginatedRows: [{ id: 10, name: 'Remote row' }],
      pagination: expect.objectContaining({
        total: 5,
        lastPage: 3,
      }),
    }));
  });
});
