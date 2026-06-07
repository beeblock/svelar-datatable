import { Plugin } from '@beeblock/svelar/plugins';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { DataTableConfig } from './types.js';
import type { Container } from '@beeblock/svelar/container';

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

const distDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(distDir);
const pub = join(packageRoot, 'src', 'publishable');

function packageMetadata(): { name: string; version: string } {
  const raw = readFileSync(join(packageRoot, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw) as { name?: string; version?: string };

  return {
    name: pkg.name ?? '@beeblock/svelar-datatable',
    version: pkg.version ?? '0.0.0',
  };
}

const metadata = packageMetadata();

export const SVELAR_DATATABLE_PACKAGE = metadata.name;
export const SVELAR_DATATABLE_VERSION = metadata.version;

export class SvelarDatatablePlugin extends Plugin {
  readonly name = SVELAR_DATATABLE_PACKAGE;
  readonly version = SVELAR_DATATABLE_VERSION;
  readonly description = 'Full-featured DataTable plugin for Svelar — sorting, searching, pagination, inline editing, export, and server-side processing';

  private _config: DatatablePluginConfig;

  constructor(config: DatatablePluginConfig = {}) {
    super();
    this._config = { ...defaultConfig, ...config, defaults: { ...defaultConfig.defaults, ...config.defaults } };
  }

  get datatableConfig() {
    return this._config;
  }

  static defaults(): Partial<DataTableConfig> {
    return { ...defaultConfig.defaults } as Partial<DataTableConfig>;
  }

  config() {
    return {
      key: 'datatable',
      defaults: {
        prefix: this._config.prefix,
        defaults: { ...this._config.defaults },
      },
    };
  }

  async register(app: Container): Promise<void> {
    app.instance('datatable.config', this.datatableConfig);
    app.instance(`${SVELAR_DATATABLE_PACKAGE}.config`, this.datatableConfig);
  }

  publishables() {
    return {
      routes: [
        { source: join(pub, 'routes/datatable.ts'), dest: 'src/routes/api/datatable/+server.ts', type: 'asset' as const },
      ],
    };
  }
}
