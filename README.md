# @beeblock/svelar-datatable

Full-featured DataTable plugin for [Svelar](https://svelar.dev) / SvelteKit 2 with Svelte 5.

## Features

- **Sorting** — single-click or multi-sort (Shift+click)
- **Searching** — global search with debounce
- **Pagination** — configurable per-page options, page navigation
- **Selection** — single, multi, range (Shift+click), select all
- **Column management** — visibility toggle and programmatic column ordering
- **Editing** — four modes: modal, bubble (popover), inline (double-click), excel (spreadsheet)
- **Export** — CSV, clipboard, browser print/PDF, and Excel with optional ExcelJS
- **Virtual scroll** — render 10,000+ rows with only visible DOM nodes
- **Row grouping** — group rows by any column value
- **Per-column filters** — programmatic column-level filtering
- **Custom cells** — Svelte 5 snippets for full cell rendering control
- **Row customization** — `rowClass`, `rowId` function, expandable detail rows
- **Server-side** — jQuery DataTables wire protocol compatible, GET or POST
- **State persistence** — save sort/filter/page/column state to localStorage
- **Tailwind CSS** — `classNames` hooks for table, toolbar, pagination, modal, and error surfaces
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

Requires Node.js 22.12 or newer. Peer dependencies: `@beeblock/svelar ^0.8.0`, `svelte ^5.0.0`. `exceljs >=4.4.0` is an optional peer dependency used only for Excel export.

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

Create a `DataTableController` instance and bind handlers with `dt.handle('query')`. Guard endpoints through the application's capability/access resolver, and keep authentication and CSRF protection enabled. Configure server-owned `searchable` and `orderable` column lists.

The server controller handles pagination, sorting, searching, and filtering through the jQuery DataTables wire protocol. GET page lengths are clamped to 1–1000. POST JSON is validated against the protocol, including the same length bounds; malformed requests return HTTP 400. Query failures return HTTP 500 with a generic error message.

Server search is case-insensitive on PostgreSQL (`ILIKE`) and uses the database driver's normal `LIKE` behavior on SQLite/MySQL.

### Server Filters

Use `serverParams` on the component for custom server filters. GET requests send these as `filters[name]` query params; POST requests include them in `customFilters`.

```svelte
<script lang="ts">
  let priority = $state('');

  function serverParams() {
    return priority ? { priority } : {};
  }
</script>

<DataTable
  serverUrl="/api/datatable/cards"
  columns={columns}
  serverParams={serverParams}
  searchable
  sortable
/>
```

Register matching filters on the server:

```ts
import { DataTableController } from '@beeblock/svelar-datatable/server';
import { Card } from '$lib/modules/boards/domain/models/Card.js';

const dt = new DataTableController(Card, {
  searchable: ['title', 'description', 'priority'],
  orderable: ['title', 'priority', 'updated_at'],
  filters: {
    priority: (query, value) => query.where('priority', value),
  },
});

export const GET = dt.handle('query');
```

### Meilisearch

When a model uses Svelar's `Searchable` mixin, global server search can use Meilisearch:

```ts
const dt = new DataTableController(Card, {
  searchDriver: 'auto',
  filters: {
    priority: (query, value) => query.where('priority', value),
  },
  meilisearchFilter: (filters) => {
    if (!filters.priority) return undefined;
    return `priority = "${String(filters.priority).replaceAll('"', '\\"')}"`;
  },
});
```

`searchDriver: 'auto'` is the default. It tries Meilisearch for global search when the model exposes `search()` and the query has no database-only constraints. It uses database search for tenant or soft-delete guards, model global scopes, base queries, active scopes, per-column searches, computed columns, and custom filters without an index filter mapping. An unavailable index or missing mapping for active custom filters also falls back to database search. Use `searchDriver: 'database'` to force SQL search. Explicit `searchDriver: 'meilisearch'` fails when indexed search cannot preserve these constraints or the model does not expose `search()`.

Meilisearch mode returns the indexed document fields from `model.search()`. Keep the datatable columns in the model's searchable/displayed attributes, and mark filtered/sorted attributes in Meilisearch index settings.

## Extending and Customizing

The plugin is meant to stay a reusable table black box, but it exposes extension points instead of forcing app-specific forks.

### Frontend Extension Points

- `customCell` snippet for custom badges, links, menus, previews, or composed app UI.
- `buttons` for export buttons and custom actions that receive selected rows and all rows.
- `classNames` for Tailwind/shadcn styling without editing plugin CSS.
- `bind:storeRef` for page-level controls such as external filters, refresh buttons, selected-row panels, or programmatic column visibility.
- `editorField` and `editorMode` for inline, modal, bubble, or Excel-style editing.

```svelte
<script lang="ts">
  import { DataTable } from '@beeblock/svelar-datatable/ui';
  import type { ButtonDef, ColumnDef } from '@beeblock/svelar-datatable';

  const columns: ColumnDef[] = [
    { key: 'title', header: 'Title' },
    { key: 'priority', header: 'Priority', type: 'custom' },
    { key: 'actions', header: 'Actions', type: 'custom', sortable: false, searchable: false },
  ];

  const buttons: ButtonDef[] = [
    {
      key: 'archive',
      label: 'Archive selected',
      disabled: (rows) => rows.length === 0,
      action: (rows) => archiveCards(rows),
    },
  ];
</script>

{#snippet customCell({ row, column, value })}
  {#if column.key === 'priority'}
    <span class="rounded border px-2 py-0.5 text-xs">{value}</span>
  {:else if column.key === 'actions'}
    <button type="button" onclick={() => openCard(row)}>Open</button>
  {:else}
    {value}
  {/if}
{/snippet}

<DataTable {columns} data={cards} {buttons} {customCell} selectable="multi" />
```

### Server Extension Points

- `filters` on `DataTableController` or `DataTableService.addFilter()` for app-specific server filters.
- `baseQuery` for tenant/team/user scoping.
- `scopes` for named reusable query constraints.
- `computedColumns` for derived SQL columns.
- `searchDriver`, `meilisearchFilter`, and `meilisearchSort` for Searchable/Meilisearch-backed server search.

```ts
const dt = new DataTableController(Card, {
  baseQuery: (query) => query.where('board_id', board.id),
  searchable: ['title', 'description', 'priority'],
  orderable: ['title', 'priority', 'position', 'updated_at'],
  filters: {
    priority: (query, value) => query.where('priority', value),
    completed: (query, value) => query.where('completed', value === 'true'),
  },
  searchDriver: 'auto',
  meilisearchFilter: (filters) => {
    const clauses = [];
    if (filters.priority) clauses.push(`priority = "${filters.priority}"`);
    if (filters.completed) clauses.push(`completed = ${filters.completed === 'true'}`);
    return clauses.length ? clauses.join(' AND ') : undefined;
  },
});
```

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

Server-side Excel editing should still go through normal Svelar backend layers. Wire `onCellEdit` to a PATCH route that validates with a FormRequest, creates a DTO, runs an action/service, and returns a resource response. Throw from `onCellEdit` when the API rejects the update so the table can keep the old value.

```svelte
<script lang="ts">
  import { apiFetchJson } from '@beeblock/svelar/http';
  import type { ButtonDef, ExportFormat } from '@beeblock/svelar-datatable';

  async function saveCell(row, columnKey, newValue) {
    const response = await apiFetchJson(`/api/datatable/cards/${row.public_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ column: columnKey, value: newValue }),
    });

    if (!response.ok) {
      throw new Error(response.error?.message ?? 'Failed to update row');
    }
  }

  const buttons: (ButtonDef | ExportFormat)[] = [
    'csv',
    {
      key: 'mark-urgent',
      label: 'Mark urgent',
      disabled: (rows) => rows.length === 0,
      action: (rows) => Promise.all(rows.map((row) => saveCell(row, 'priority', 'urgent'))),
    },
  ];
</script>

<DataTable
  serverUrl="/api/datatable/cards"
  {columns}
  selectable="multi"
  editorMode="excel"
  onCellEdit={saveCell}
  {buttons}
/>
```

## Tailwind Customization

Style the supported surfaces with Tailwind utility classes via the `classNames` prop:

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

The component uses these 26 `classNames` hooks: `container`, `toolbar`, `toolbarLeft`, `toolbarRight`, `searchInput`, `table` (the scroll wrapper), `thead`, `th`, `tbody`, `tr`, `trSelected`, `trEven`, `td`, `tfoot`, `tf`, `pagination`, `paginationInfo`, `paginationControls`, `pageButton`, `perPageSelect`, `btnCreate`, `btnEdit`, `btnDelete`, `editorModal`, `editorBackdrop`, and `error`.

The type also declares `thSortable`, `pageButtonActive`, `btn`, `editorField`, `editorInput`, `editorLabel`, `loading`, and `empty`; the current components do not consume those keys. Active page buttons use the `sdt-page-active` class. Editor inputs accept `EditorFieldDef.className`.

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
npm run check
npm run test
npm run build
```

## License

MIT
