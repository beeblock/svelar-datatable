import { describe, expect, it } from 'vitest';
import { DataTableController } from '../src/server/DataTableController.js';

describe('DataTableController', () => {
  it('returns a safe 400 for malformed POST protocol data', async () => {
    const controller = new DataTableController({ query: () => { throw new Error('Should not run'); } });
    const response = await controller.query({ request: new Request('https://fixture.test', { method: 'POST', body: '{}' }), url: new URL('https://fixture.test') });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Invalid table request.');
  });

  it('returns a 500 and redacts service errors', async () => {
    const controller = new DataTableController({ query: () => { throw new Error('private database password'); } });
    const response = await controller.query({ request: new Request('https://fixture.test'), url: new URL('https://fixture.test') });
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Unable to load table data.');
  });
});
