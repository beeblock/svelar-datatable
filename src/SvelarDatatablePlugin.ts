import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { DataTableConfig } from './types.js';

interface DatatablePluginConfig {
  prefix?: string;
  defaults?: Partial<DataTableConfig>;
}

const defaultConfig: DatatablePluginConfig = {
  prefix: '/api',
  defaults: {
    perPage: 15,
    perPageOptions: [10, 15, 25, 50, 100],
    searchDebounceMs: 300,
    sortable: true,
    searchable: true,
    paginate: true,
    selectable: 'none',
    striped: true,
    hover: true,
    bordered: false,
    compact: false,
    responsive: true,
    virtualScroll: false,
    virtualRowHeight: 48,
  },
};

export class SvelarDatatablePlugin {
  private _config: DatatablePluginConfig;

  constructor(config: DatatablePluginConfig = {}) {
    this._config = { ...defaultConfig, ...config, defaults: { ...defaultConfig.defaults, ...config.defaults } };
  }

  get name() {
    return 'svelar-datatable';
  }

  get config() {
    return this._config;
  }

  static defaults(): Partial<DataTableConfig> {
    return { ...defaultConfig.defaults } as Partial<DataTableConfig>;
  }

  publishables() {
    const base = dirname(fileURLToPath(import.meta.url));
    return {
      routes: [
        { source: join(base, 'publishable/routes/datatable.ts'), dest: 'src/routes/api/datatable/+server.ts', type: 'asset' as const },
      ],
    };
  }
}
