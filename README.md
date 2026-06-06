# @beeblock/svelar-datatable

Full-featured DataTable plugin for [Svelar](https://svelar.dev) / SvelteKit 2 with Svelte 5.

## Features

- **Sorting** — single-click or multi-sort (Shift+click)
- **Searching** — global search with debounce
- **Pagination** — configurable per-page options, page navigation
- **Selection** — single, multi, range (Shift+click), select all
- **Column management** — visibility toggle, reorder, resize
- **Editing** — four modes: modal, bubble (popover), inline (double-click), excel (spreadsheet)
- **Export** — CSV, clipboard, print (Excel/PDF with optional deps)
- **Virtual scroll** — render 10,000+ rows with only visible DOM nodes
- **Row grouping** — group rows by any column value
- **Per-column filters** — programmatic column-level filtering
- **Custom cells** — Svelte 5 snippets for full cell rendering control
- **Row customization** — `rowClass`, `rowId` function, expandable detail rows
- **Server-side** — jQuery DataTables wire protocol compatible, GET or POST
- **State persistence** — save sort/filter/page/column state to localStorage
- **Tailwind CSS** — `classNames` prop for pure Tailwind customization of every element
- **CSS variables** — 12+ CSS custom properties for quick theming
- **Footer aggregation** — per-column footer with custom functions
- **Responsive** — horizontal scroll for small screens

## Installation

```bash
# Install and publish route stubs
npx svelar plugin:install @beeblock/svelar-datatable

# Or manual install
npm install @beeblock/svelar-datatable
npx svelar plugin:publish @beeblock/svelar-datatable
```

Peer dependencies: `@beeblock/svelar >= 0.6.7`, `svelte ^5.0.0`. `exceljs` is an optional peer dependency used only for Excel export.

## Quick Start

```svelte
<script lang="ts">
  import { DataTable } from '@beeblock/svelar-datatable/ui';
  import type { ColumnDef } from '@beeblock/svelar-datatable';

  const columns: ColumnDef[] = [
    { key: 'id', header: 'ID', type: 'number', sortable: true },
    { key: 'name', header: 'Name', sortable: true, searchable: true },
    { key: 'email', header: 'Email', sortable: true, searchable: true },
  ];

  const data = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
</script>

<DataTable {data} {columns} sortable searchable paginate perPage={10} />
```

## Server-Side

```svelte
<!-- Frontend -->
<DataTable
  serverUrl="/api/datatable/users"
  columns={columns}
  sortable
  searchable
  paginate
  perPage={25}
/>
```

```ts
// src/routes/api/datatable/users/+server.ts
import { DataTableController } from '@beeblock/svelar-datatable/server';
import { User } from '$lib/modules/auth/domain/models/User.js';

const dt = new DataTableController(User);
export const GET = dt.handle('query');
export const POST = dt.handle('query');
```

The server controller handles pagination, sorting, searching, and filtering — compatible with the jQuery DataTables wire protocol.

## Plugin Contract

The package exposes the required Svelar plugin entry at `@beeblock/svelar-datatable/plugin`.

```ts
import DatatablePlugin from '@beeblock/svelar-datatable/plugin';
```

The plugin publishes a route stub to `src/routes/api/datatable/+server.ts` and registers default config under the `datatable` config key.

## Editing

Four editor modes, configured via `editorMode`:

```svelte
<!-- Modal editor -->
<DataTable editorMode="modal" editorFields={fields} onEdit={save} onCreate={create} />

<!-- Bubble (popover anchored to row) -->
<DataTable editorMode="bubble" editorFields={fields} onEdit={save} />

<!-- Inline (double-click a cell) -->
<DataTable editorMode="inline" onCellEdit={saveCellEdit} />

<!-- Excel (spreadsheet navigation) -->
<DataTable editorMode="excel" onCellEdit={saveCellEdit} />
```

## Tailwind Customization

Style every element with Tailwind utility classes via the `classNames` prop:

```svelte
<DataTable
  {data}
  {columns}
  striped={false}
  hover={false}
  classNames={{
    container: '!bg-slate-900 !border-slate-800',
    thead: '!bg-slate-950',
    th: '!bg-slate-950 !text-slate-400 !tracking-widest',
    tr: 'hover:!bg-slate-800',
    td: '!text-slate-300 !border-b-slate-800',
    pagination: '!border-t-slate-800 !text-slate-400 !bg-slate-900',
    pageButton: '!bg-slate-800 !text-slate-400 !border-slate-700',
    searchInput: '!bg-slate-800 !text-slate-200 !border-slate-700',
  }}
/>
```

All 39 keys from `DataTableClassNames` are wired: `container`, `toolbar`, `toolbarLeft`, `toolbarRight`, `searchInput`, `thead`, `th`, `tbody`, `tr`, `trSelected`, `trEven`, `td`, `tfoot`, `tf`, `pagination`, `paginationInfo`, `paginationControls`, `pageButton`, `pageButtonActive`, `perPageSelect`, `btn`, `btnCreate`, `btnEdit`, `btnDelete`, `editorModal`, `editorBackdrop`, `editorField`, `editorInput`, `editorLabel`, `loading`, `empty`, `error`.

## Imports

```ts
// UI component (Svelte source — not compiled)
import { DataTable } from '@beeblock/svelar-datatable/ui';

// Types
import type {
  ColumnDef, EditorFieldDef, ButtonDef, DataTableClassNames,
  DataTableConfig, DataTableState, ExportFormat,
} from '@beeblock/svelar-datatable';

// Stores
import { DataTableStore, ServerDataTableStore } from '@beeblock/svelar-datatable';

// Server controller (API routes)
import { DataTableController, DataTableService } from '@beeblock/svelar-datatable/server';
```

## Documentation

Full documentation with all props, callbacks, store API, and examples: [svelar.dev/docs/datatable](https://svelar.dev/docs/datatable)

## Local Validation

```bash
npm run lint
npm run test
npm run build
```

## License

MIT
