import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Connection, Migration } from '@beeblock/svelar/database';
import { Model } from '@beeblock/svelar/orm';
import { DataTableService } from '../src/server/DataTableService.js';
import { parseDataTableRequest } from '../src/server/DataTableRequest.js';

class CreateRows extends Migration {
  async up() {
    await this.schema.createTable('datatable_rows', (table) => {
      table.increments();
      table.integer('team_id');
      table.string('name');
      table.string('email');
      table.string('secret');
    });
  }
  async down() { await this.schema.dropTableIfExists('datatable_rows'); }
}

class Row extends Model {
  static table = 'datatable_rows';
  static timestamps = false;
  static fillable = ['team_id', 'name', 'email', 'secret'];
  static hidden = ['secret'];
}

beforeAll(async () => {
  Connection.configure({ default: 'datatable-test', connections: { 'datatable-test': { driver: 'sqlite', filename: ':memory:' } } });
  await new CreateRows().up();
  await Row.create({ team_id: 1, name: 'Alice', email: 'alice@example.test', secret: 'private' });
  await Row.create({ team_id: 1, name: 'Bob', email: 'bob@example.test', secret: 'private' });
  await Row.create({ team_id: 2, name: 'Foreign', email: 'foreign@example.test', secret: 'private' });
});
afterAll(async () => { await Connection.disconnect(); });

describe('DataTableService with candidate Svelar ORM', () => {
  it('groups global OR search inside the base visibility constraint and serializes hidden fields safely', async () => {
    const service = new DataTableService(Row, { searchable: ['name', 'email'], orderable: ['name'], baseQuery: (query) => query.where('team_id', 1) });
    const request = parseDataTableRequest(new URLSearchParams({ 'search[value]': 'example.test', 'columns[0][data]': 'name', 'order[0][column]': '0', 'order[0][dir]': 'desc', length: '1' }));
    const response = await service.process(request);
    expect(response.error).toBeUndefined();
    expect(response.recordsTotal).toBe(2);
    expect(response.recordsFiltered).toBe(2);
    expect(JSON.parse(JSON.stringify(response.data))).toEqual([{ id: 2, team_id: 1, name: 'Bob', email: 'bob@example.test' }]);
  });

  it('preserves explicit tenant and global scopes even when a model offers indexed search', async () => {
    class ScopedRow extends Row {
      static tenantScoped = true;
      static query() { return super.query().forTenant(1); }
      static search = vi.fn();
    }
    ScopedRow.addGlobalScope('visible', (query) => query.where('name', 'Bob'));
    const request = parseDataTableRequest(new URLSearchParams({ 'search[value]': 'example.test' }));
    const response = await new DataTableService(ScopedRow, { searchable: ['email'] }).process(request);
    expect(response.error).toBeUndefined();
    expect(response.recordsTotal).toBe(1);
    expect(response.recordsFiltered).toBe(1);
    expect(ScopedRow.search).not.toHaveBeenCalled();
    expect(JSON.parse(JSON.stringify(response.data)).map((row: any) => row.name)).toEqual(['Bob']);
  });

  it('keeps model fields alongside computed columns', async () => {
    const response = await new DataTableService(Row, { computedColumns: { label: "name || ' display'" } }).process(parseDataTableRequest(new URLSearchParams()));
    expect(response.error).toBeUndefined();
    expect(JSON.parse(JSON.stringify(response.data[0]))).toEqual({ id: 1, team_id: 1, name: 'Alice', email: 'alice@example.test', label: 'Alice display' });
  });

  it('does not widen an application projection while adding computed columns', async () => {
    const response = await new DataTableService(Row, { baseQuery: (query) => query.select('name'), computedColumns: { label: "name || ' display'" } }).process(parseDataTableRequest(new URLSearchParams()));
    expect(response.error).toBeUndefined();
    expect(JSON.parse(JSON.stringify(response.data[0]))).toEqual({ name: 'Alice', label: 'Alice display' });
  });
});
