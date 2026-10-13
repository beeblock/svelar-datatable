import { describe, expect, it, vi } from 'vitest';
import { DataTableService } from '../src/server/DataTableService.js';
import type { DataTableRequest } from '../src/types.js';
import { Connection } from '@beeblock/svelar/database';

type Row = { id: number; name: string; email: string; role: string };
type Filter = (row: Row) => boolean;

class FakeQuery {
  private filters: Filter[] = [];
  private order: { column: keyof Row; direction: 'asc' | 'desc' } | null = null;
  private start = 0;
  private take: number | null = null;

  constructor(private rows: Row[]) {}

  where(column: keyof Row, operatorOrValue: any, maybeValue?: any): this {
    const operator = maybeValue === undefined ? '=' : operatorOrValue;
    const value = maybeValue === undefined ? operatorOrValue : maybeValue;

    this.filters.push((row) => {
      const current = String(row[column] ?? '');
      if (operator === 'LIKE') {
        return current.includes(String(value).replaceAll('%', ''));
      }
      if (operator === 'ILIKE') {
        return current.toLowerCase().includes(String(value).replaceAll('%', '').toLowerCase());
      }
      return current === String(value);
    });

    return this;
  }

  orWhere(column: keyof Row, operatorOrValue: any, maybeValue?: any): this {
    return this.where(column, operatorOrValue, maybeValue);
  }

  whereNested(callback: (query: FakeNestedQuery) => void): this {
    const nested = new FakeNestedQuery();
    callback(nested);
    this.filters.push((row) => nested.matches(row));
    return this;
  }

  selectRaw(): this {
    return this;
  }

  clone(): FakeQuery {
    const next = new FakeQuery(this.rows);
    next.filters = [...this.filters];
    next.order = this.order;
    next.start = this.start;
    next.take = this.take;
    return next;
  }

  async count(): Promise<number> {
    return this.apply().length;
  }

  orderBy(column: keyof Row, direction: 'asc' | 'desc'): this {
    this.order = { column, direction };
    return this;
  }

  offset(start: number): this {
    this.start = start;
    return this;
  }

  limit(take: number): this {
    this.take = take;
    return this;
  }

  async get(): Promise<Row[]> {
    const rows = this.apply();
    return this.take === null ? rows.slice(this.start) : rows.slice(this.start, this.start + this.take);
  }

  private apply(): Row[] {
    let rows = this.rows.filter((row) => this.filters.every((filter) => filter(row)));

    if (this.order) {
      const { column, direction } = this.order;
      rows = [...rows].sort((a, b) => {
        const result = String(a[column]).localeCompare(String(b[column]));
        return direction === 'desc' ? -result : result;
      });
    }

    return rows;
  }
}

class FakeNestedQuery {
  private filters: Filter[] = [];

  where(column: keyof Row, operatorOrValue: any, maybeValue?: any): this {
    const operator = maybeValue === undefined ? '=' : operatorOrValue;
    const value = maybeValue === undefined ? operatorOrValue : maybeValue;
    this.filters.push((row) => {
      const current = String(row[column] ?? '');
      if (operator === 'LIKE') {
        return current.includes(String(value).replaceAll('%', ''));
      }
      if (operator === 'ILIKE') {
        return current.toLowerCase().includes(String(value).replaceAll('%', '').toLowerCase());
      }
      return current === String(value);
    });
    return this;
  }

  orWhere(column: keyof Row, operatorOrValue: any, maybeValue?: any): this {
    return this.where(column, operatorOrValue, maybeValue);
  }

  matches(row: Row): boolean {
    return this.filters.some((filter) => filter(row));
  }
}

const rows: Row[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'member' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'member' },
];

Connection.configure({
  default: 'default',
  connections: {
    default: {
      driver: 'postgres',
      database: 'test',
    },
  },
});

const model = {
  query: () => new FakeQuery(rows),
};

function request(overrides: Partial<DataTableRequest> = {}): DataTableRequest {
  return {
    draw: 7,
    start: 0,
    length: 10,
    search: { value: '', regex: false },
    order: [],
    columns: [
      { data: 'name', name: 'Name', searchable: true, orderable: true, search: { value: '', regex: false } },
      { data: 'email', name: 'Email', searchable: true, orderable: true, search: { value: '', regex: false } },
      { data: 'role', name: 'Role', searchable: true, orderable: true, search: { value: '', regex: false } },
    ],
    ...overrides,
  };
}

describe('DataTableService', () => {
  it('searches, sorts, and paginates model queries', async () => {
    const service = new DataTableService<Row>(model, {
      searchable: ['name', 'email'],
      orderable: ['name'],
    });

    const response = await service.process(request({
      search: { value: 'example.com', regex: false },
      order: [{ column: 0, dir: 'desc' }],
      start: 0,
      length: 2,
    }));

    expect(response).toEqual({
      draw: 7,
      recordsTotal: 3,
      recordsFiltered: 3,
      data: [
        { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'member' },
        { id: 2, name: 'Bob', email: 'bob@example.com', role: 'member' },
      ],
    });
  });

  it('applies per-column search', async () => {
    const service = new DataTableService<Row>(model);
    const response = await service.process(request({
      columns: [
        { data: 'name', name: 'Name', searchable: true, orderable: true, search: { value: '', regex: false } },
        { data: 'role', name: 'Role', searchable: true, orderable: true, search: { value: 'admin', regex: false } },
      ],
    }));

    expect(response.recordsFiltered).toBe(1);
    expect(response.data[0].name).toBe('Alice');
  });

  it('uses case-insensitive search for PostgreSQL server queries', async () => {
    const service = new DataTableService<Row>(model, {
      searchable: ['name'],
      searchDriver: 'database',
    });

    const response = await service.process(request({
      search: { value: 'alice', regex: false },
    }));

    expect(response.recordsFiltered).toBe(1);
    expect(response.data[0].name).toBe('Alice');
  });

  it('applies custom server filters before counting filtered rows', async () => {
    const service = new DataTableService<Row>(model, {
      filters: {
        role: (query, value) => query.where('role', value),
      },
    });

    const response = await service.process(request({
      customFilters: { role: 'member' },
    }));

    expect(response.recordsTotal).toBe(3);
    expect(response.recordsFiltered).toBe(2);
    expect(response.data.map((row) => row.name)).toEqual(['Bob', 'Charlie']);
  });

  it('uses Meilisearch for Searchable models when searchDriver is auto', async () => {
    const searchableModel = {
      query: () => new FakeQuery(rows),
      search: async (query: string, options: any) => ({
        hits: [{ id: 10, name: `Meili ${query}`, email: 'meili@example.com', role: 'admin' }],
        query,
        processingTimeMs: 1,
        estimatedTotalHits: 1,
        limit: options.limit,
        offset: options.offset,
      }),
    };
    const service = new DataTableService<Row>(searchableModel);

    const response = await service.process(request({
      search: { value: 'redis', regex: false },
      start: 5,
      length: 10,
    }));

    expect(response.recordsTotal).toBe(3);
    expect(response.recordsFiltered).toBe(1);
    expect(response.data).toEqual([
      { id: 10, name: 'Meili redis', email: 'meili@example.com', role: 'admin' },
    ]);
  });

  it('honors server search allowlists for per-column searches, including an empty list', async () => {
    const columns = request().columns.map((column) => ({ ...column, search: { value: column.data === 'role' ? 'admin' : '', regex: false } }));
    for (const searchable of [['name'], []]) {
      const response = await new DataTableService(model, { searchable, orderable: [] }).process(request({ columns, order: [{ column: 0, dir: 'desc' }] }));
      expect(response.recordsFiltered).toBe(3);
      expect(response.data.map((row: Row) => row.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    }
  });

  it('does not use prototype properties as registered custom filters', async () => {
    const response = await new DataTableService(model).process(request({ customFilters: { toString: 'member', constructor: 'member' } }));
    expect(response.recordsFiltered).toBe(3);
    expect(response.error).toBeUndefined();
  });

  it('uses returned base queries and scopes rather than discarding their restrictions', async () => {
    const response = await new DataTableService(model, {
      baseQuery: () => new FakeQuery(rows).where('role', 'member'),
      scopes: { bob: () => new FakeQuery(rows).where('name', 'Bob') },
    }).applyScope('bob').process(request());
    expect(response.recordsTotal).toBe(2);
    expect(response.data.map((row: Row) => row.name)).toEqual(['Bob']);
  });

  it.each([
    { baseQuery: (query: FakeQuery) => query.where('role', 'member') },
    { filters: { role: (query: FakeQuery, value: string) => query.where('role', value) } },
  ])('preserves database constraints when indexed search is automatic', async (options) => {
    const search = vi.fn();
    const response = await new DataTableService({ ...model, search }, options).process(request({ search: { value: 'Bob', regex: false }, customFilters: { role: 'member' } }));
    expect(search).not.toHaveBeenCalled();
    expect(response.data.map((row: Row) => row.name)).toEqual(['Bob']);
  });

  it.each([{ tenantScoped: true }, { softDeletes: true }, { globalScopes: () => new Map([['visible', () => {}]]) }])('does not bypass model visibility guards through indexed search', async (guard) => {
    const search = vi.fn();
    const response = await new DataTableService({ ...model, ...guard, search }).process(request({ search: { value: 'Bob', regex: false } }));
    expect(search).not.toHaveBeenCalled();
    expect(response.data.map((row: Row) => row.name)).toEqual(['Bob']);
  });

  it('fails closed for explicit indexed search with untranslatable database constraints', async () => {
    const search = vi.fn();
    const response = await new DataTableService({ ...model, tenantScoped: true, search }, { searchDriver: 'meilisearch' }).process(request({ search: { value: 'Bob', regex: false } }));
    expect(search).not.toHaveBeenCalled();
    expect(response.error).toBe('Unable to load table data.');
    expect(response.data).toEqual([]);
  });

  it('falls back if an indexed filter mapping does not cover active filters', async () => {
    const search = vi.fn();
    const response = await new DataTableService({ ...model, search }, {
      filters: { role: (query, value) => query.where('role', value) },
      meilisearchFilter: () => undefined,
    }).process(request({ search: { value: 'Bob', regex: false }, customFilters: { role: 'member' } }));
    expect(search).not.toHaveBeenCalled();
    expect(response.data.map((row: Row) => row.name)).toEqual(['Bob']);
  });

  it('does not expose storage exception details in a table response', async () => {
    const response = await new DataTableService({ query: () => { throw new Error('postgres://private-credential'); } }).process(request());
    expect(response.error).toBe('Unable to load table data.');
  });
});
