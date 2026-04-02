// API routes for @beeblock/svelar-datatable
// Copy to: src/routes/api/datatable/+server.ts

import { DataTableController } from '@beeblock/svelar-datatable/server';
import type { RequestHandler } from './$types';

// Replace `YourModel` with your actual Eloquent-style model import.
// Options let you customise searchable columns, sorting, etc.
//
// import { User } from '$lib/models/User';
//
// export const GET: RequestHandler = (event) =>
//   DataTableController.handle(event, User, {
//     searchable: ['name', 'email'],
//     sortable: ['name', 'email', 'created_at'],
//   });
//
// POST is also supported for complex filter payloads:
// export const POST: RequestHandler = (event) =>
//   DataTableController.handle(event, User);

export const GET: RequestHandler = (event) => {
  // TODO: replace with your model and options
  throw new Error('Configure your model in this route before using DataTableController.handle()');
};

export const POST: RequestHandler = (event) => {
  // TODO: replace with your model and options
  throw new Error('Configure your model in this route before using DataTableController.handle()');
};
