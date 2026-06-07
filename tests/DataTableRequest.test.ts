import { describe, expect, it } from 'vitest';
import { parseDataTableRequest } from '../src/server/DataTableRequest.js';

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
});
