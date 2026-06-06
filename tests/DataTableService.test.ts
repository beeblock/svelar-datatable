import { describe, expect, it } from 'vitest';
import { DataTableService } from '../src/server/DataTableService.js';
import type { DataTableRequest } from '../src/types.js';

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
});
