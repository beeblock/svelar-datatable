import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { Container } from '@beeblock/svelar/container';
import pkg from '../package.json';
import {
  SVELAR_DATATABLE_PACKAGE,
  SVELAR_DATATABLE_VERSION,
  SvelarDatatablePlugin,
} from '../src/SvelarDatatablePlugin.js';

describe('SvelarDatatablePlugin', () => {
  it('uses package metadata as the plugin identity', () => {
    const plugin = new SvelarDatatablePlugin();

    expect(SVELAR_DATATABLE_PACKAGE).toBe('@beeblock/svelar-datatable');
    expect(SVELAR_DATATABLE_VERSION).toBe(pkg.version);
    expect(plugin.name).toBe(pkg.name);
    expect(plugin.version).toBe(pkg.version);
  });

  it('exposes config defaults and registers them in the container', async () => {
    const plugin = new SvelarDatatablePlugin({
      prefix: '/internal-api',
      defaults: {
        perPage: 25,
        searchable: false,
      },
    });

    expect(plugin.config()).toEqual({
      key: 'datatable',
      defaults: {
        prefix: '/internal-api',
        defaults: expect.objectContaining({
          perPage: 25,
          searchable: false,
          sortable: true,
        }),
      },
    });

    const app = new Container();
    await plugin.register(app);

    await expect(app.make('datatable.config')).resolves.toEqual(plugin.datatableConfig);
    await expect(app.make('@beeblock/svelar-datatable.config')).resolves.toEqual(plugin.datatableConfig);
  });

  it('publishes the route stub from packaged source files', () => {
    const plugin = new SvelarDatatablePlugin();
    const publishables = plugin.publishables();
    const route = publishables.routes[0];

    expect(route.dest).toBe('src/routes/api/datatable/+server.ts');
    expect(route.type).toBe('asset');
    expect(existsSync(route.source)).toBe(true);
  });
});
