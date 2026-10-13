import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServerDataTableStore } from '../src/state/ServerDataTableStore.js';
import type { DataTableResponse } from '../src/types.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function result(draw: number, name: string): DataTableResponse {
  return { draw, recordsTotal: 1, recordsFiltered: 1, data: [{ id: 1, name }] };
}

function store(extra = {}) {
  return new ServerDataTableStore({ serverUrl: '/api/rows', columns: [{ key: 'name', header: 'Name' }], ...extra });
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('ServerDataTableStore', () => {
  it('keeps the latest response when an aborted request finishes parsing afterward', async () => {
    const oldBody = deferred<DataTableResponse>();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => oldBody.promise })
      .mockResolvedValueOnce({ ok: true, json: async () => result(2, 'Latest') }));
    const table = store();
    const oldRequest = table.initialFetch();
    await Promise.resolve();
    await table.initialFetch();
    oldBody.resolve(result(1, 'Stale'));
    await oldRequest;
    expect(table.getState().allRows[0].name).toBe('Latest');
    expect(table.getState().draw).toBe(2);
    table.destroy();
  });

  it('ignores old failures after a newer request has succeeded', async () => {
    const old = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(Response.json(result(2, 'Latest'))));
    const table = store();
    const oldRequest = table.initialFetch();
    await table.initialFetch();
    old.reject(new Error('Old failure'));
    await oldRequest;
    expect(table.getState().error).toBeNull();
    expect(table.getState().allRows[0].name).toBe('Latest');
    table.destroy();
  });

  it('invalidates old work during the configured search debounce and notifies subscribers immediately', async () => {
    vi.useFakeTimers();
    const old = deferred<Response>();
    const fetcher = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(Response.json(result(3, 'Filtered')));
    vi.stubGlobal('fetch', fetcher);
    const table = store({ searchDebounceMs: 40 });
    const listener = vi.fn();
    table.subscribe(listener);
    const oldRequest = table.initialFetch();
    listener.mockClear();
    table.setGlobalSearch('Filtered');
    expect(listener).toHaveBeenCalledOnce();
    old.resolve(Response.json(result(1, 'Stale')));
    await oldRequest;
    expect(table.getState().allRows).toEqual([]);
    await vi.advanceTimersByTimeAsync(39);
    expect(fetcher).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(table.getState().allRows[0].name).toBe('Filtered');
    table.destroy();
  });

  it('preserves existing query parameters and fragments', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result(1, 'Row')));
    vi.stubGlobal('fetch', fetcher);
    const table = store({ serverUrl: '/api/rows?team=7#results', serverParams: { role: 'member' } });
    await table.initialFetch();
    const url = new URL(fetcher.mock.calls[0][0], 'https://fixture.test');
    expect(url.searchParams.get('team')).toBe('7');
    expect(url.searchParams.get('draw')).toBe('1');
    expect(url.searchParams.get('filters[role]')).toBe('member');
    expect(url.hash).toBe('#results');
    table.destroy();
  });

  it('uses configured CSRF names on POST and respects non-orderable columns', async () => {
    vi.stubGlobal('document', { cookie: 'CUSTOM-TOKEN=token%20value' });
    const fetcher = vi.fn().mockResolvedValue(Response.json(result(1, 'Row')));
    vi.stubGlobal('fetch', fetcher);
    const table = store({ serverMethod: 'POST', csrfCookieName: 'CUSTOM-TOKEN', csrfHeaderName: 'X-Custom-CSRF', columns: [{ key: 'name', header: 'Name', orderable: false }] });
    await table.initialFetch();
    const options = fetcher.mock.calls[0][1];
    expect(options.headers['X-Custom-CSRF']).toBe('token value');
    expect(JSON.parse(options.body).columns[0].orderable).toBe(false);
    table.destroy();
  });

  it('settles loading with an error when draw or response metadata is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result(99, 'Wrong draw'))));
    const table = store();
    await table.initialFetch();
    expect(table.getState().loading).toBe(false);
    expect(table.getState().error).toBe('Invalid table response');
    expect(table.getState().allRows).toEqual([]);
    table.destroy();
  });

  it('reports serverParams failures and stops requests after destruction', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const table = store({ serverParams: () => { throw new Error('Invalid filters'); } });
    await table.initialFetch();
    expect(table.getState().loading).toBe(false);
    expect(table.getState().error).toBe('Invalid filters');
    table.destroy();
    await table.initialFetch();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
