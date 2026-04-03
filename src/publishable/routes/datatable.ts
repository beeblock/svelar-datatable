// API routes for @beeblock/svelar-datatable
// Copy to: src/routes/api/datatable/+server.ts

import { DataTableController } from '@beeblock/svelar-datatable/server';
import type { RequestHandler } from './$types';

// Replace `YourModel` with your actual Eloquent-style model import.
// Options let you customise searchable columns, sorting, etc.
//
// import { User } from '$lib/models/User';
//
// const ctrl = new DataTableController(User, {
//   searchable: ['name', 'email'],
//   orderable: ['name', 'email', 'created_at'],
// });
//
// export const GET: RequestHandler = ctrl.handle('query');
// export const POST: RequestHandler = ctrl.handle('query');

export const GET: RequestHandler = (event) => {
  // TODO: replace with your model and options
  throw new Error('Configure your model in this route before using DataTableController');
};

export const POST: RequestHandler = (event) => {
  // TODO: replace with your model and options
  throw new Error('Configure your model in this route before using DataTableController');
};
