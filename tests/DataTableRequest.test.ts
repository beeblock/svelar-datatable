import { describe, expect, it } from 'vitest';
import { DataTableRequestError, parseDataTableRequest, parseDataTableRequestFromBody } from '../src/server/DataTableRequest.js';

describe('parseDataTableRequest', () => {
  it('parses DataTables query params', () => {
    const params = new URLSearchParams({
      draw: '3',
      start: '20',
      length: '10',
      'search[value]': 'alice',
      'search[regex]': 'false',
      'order[0][column]': '1',
      'order[0][dir]': 'desc',
      'columns[0][data]': 'id',
      'columns[0][name]': 'ID',
      'columns[0][searchable]': 'false',
      'columns[0][orderable]': 'true',
      'columns[0][search][value]': '',
      'columns[0][search][regex]': 'false',
      'columns[1][data]': 'name',
      'columns[1][name]': 'Name',
      'columns[1][searchable]': 'true',
      'columns[1][orderable]': 'true',
      'columns[1][search][value]': 'ali',
      'columns[1][search][regex]': 'false',
    });

    expect(parseDataTableRequest(params)).toEqual({
      draw: 3,
      start: 20,
      length: 10,
      search: { value: 'alice', regex: false },
      order: [{ column: 1, dir: 'desc' }],
      columns: [
        {
          data: 'id',
          name: 'ID',
          searchable: false,
          orderable: true,
          search: { value: '', regex: false },
        },
        {
          data: 'name',
          name: 'Name',
          searchable: true,
          orderable: true,
          search: { value: 'ali', regex: false },
        },
      ],
    });
  });

  it('clamps invalid numeric params and unsafe sort directions', () => {
    const params = new URLSearchParams({
      draw: 'bad',
      start: '-10',
      length: '0',
      'order[0][column]': '-2',
      'order[0][dir]': 'drop-table',
      'columns[0][data]': 'name',
    });

    const request = parseDataTableRequest(params);

    expect(request.draw).toBe(1);
    expect(request.start).toBe(0);
    expect(request.length).toBe(1);
    expect(request.order).toEqual([{ column: 0, dir: 'asc' }]);
  });

  it('parses custom server filters', () => {
    const params = new URLSearchParams({
      draw: '1',
      start: '0',
      length: '10',
      'columns[0][data]': 'name',
      'filters[role]': 'admin',
      'filters[priority]': 'urgent',
    });

    expect(parseDataTableRequest(params).customFilters).toEqual({
      role: 'admin',
      priority: 'urgent',
    });
  });

  it('bounds page sizes and rejects partial or unsafe integers', () => {
    const request = parseDataTableRequest(new URLSearchParams({ draw: '3junk', start: '9007199254740992', length: '5000' }));
    expect(request.draw).toBe(1);
    expect(request.start).toBe(0);
    expect(request.length).toBe(1000);
  });

  it('validates JSON requests using the same protocol shape', async () => {
    const value = parseDataTableRequest(new URLSearchParams({ 'columns[0][data]': 'name' }));
    const body = (data: unknown) => new Request('https://fixture.test', { method: 'POST', body: JSON.stringify(data) });
    await expect(parseDataTableRequestFromBody(body(value))).resolves.toEqual(value);
    await expect(parseDataTableRequestFromBody(body({ ...value, length: 1001 }))).rejects.toBeInstanceOf(DataTableRequestError);
    await expect(parseDataTableRequestFromBody(body({ ...value, order: [{ column: 0, dir: 'DROP TABLE' }] }))).rejects.toBeInstanceOf(DataTableRequestError);
    await expect(parseDataTableRequestFromBody(body(null))).rejects.toBeInstanceOf(DataTableRequestError);
    await expect(parseDataTableRequestFromBody(new Request('https://fixture.test', { method: 'POST', body: '{' }))).rejects.toBeInstanceOf(DataTableRequestError);
  });
});
