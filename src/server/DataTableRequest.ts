import type { DataTableRequest } from '../types.js';
import { z } from '@beeblock/svelar/validation';

const maxPageLength = 1000;
const maxColumns = 1000;
const searchSchema = z.object({ value: z.string(), regex: z.boolean() });
const requestSchema = z.object({
  draw: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  start: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  length: z.number().int().min(1).max(maxPageLength),
  search: searchSchema,
  order: z.array(z.object({ column: z.number().int().min(0).max(maxColumns - 1), dir: z.enum(['asc', 'desc']) })).max(maxColumns),
  columns: z.array(z.object({
    data: z.string(), name: z.string(), searchable: z.boolean(), orderable: z.boolean(), search: searchSchema,
  })).max(maxColumns),
  customFilters: z.record(z.string(), z.unknown()).optional(),
});

export class DataTableRequestError extends Error {
  constructor() { super('Invalid table request.'); }
}

function validateRequest(value: unknown): DataTableRequest {
  const result = requestSchema.safeParse(value);
  if (!result.success) throw new DataTableRequestError();
  return result.data;
}

function integerParam(value: string | null, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sortDirection(value: string | null): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc';
}

export function parseDataTableRequest(params: URLSearchParams): DataTableRequest {
  const draw = integerParam(params.get('draw'), 1, 1);
  const start = integerParam(params.get('start'), 0, 0);
  const length = integerParam(params.get('length'), 15, 1, maxPageLength);

  const search = {
    value: params.get('search[value]') ?? '',
    regex: params.get('search[regex]') === 'true',
  };

  const order: DataTableRequest['order'] = [];
  let orderIdx = 0;
  while (params.has(`order[${orderIdx}][column]`)) {
    if (orderIdx >= maxColumns) throw new DataTableRequestError();
    order.push({
      column: integerParam(params.get(`order[${orderIdx}][column]`), 0, 0),
      dir: sortDirection(params.get(`order[${orderIdx}][dir]`)),
    });
    orderIdx++;
  }

  const columns: DataTableRequest['columns'] = [];
  let colIdx = 0;
  while (params.has(`columns[${colIdx}][data]`)) {
    if (colIdx >= maxColumns) throw new DataTableRequestError();
    columns.push({
      data: params.get(`columns[${colIdx}][data]`) ?? '',
      name: params.get(`columns[${colIdx}][name]`) ?? '',
      searchable: params.get(`columns[${colIdx}][searchable]`) !== 'false',
      orderable: params.get(`columns[${colIdx}][orderable]`) !== 'false',
      search: {
        value: params.get(`columns[${colIdx}][search][value]`) ?? '',
        regex: params.get(`columns[${colIdx}][search][regex]`) === 'true',
      },
    });
    colIdx++;
  }

  const customFilters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    const match = key.match(/^filters\[(.+)\]$/);
    if (match && value !== '') {
      Object.defineProperty(customFilters, match[1], { value, enumerable: true, configurable: true, writable: true });
    }
  }

  return validateRequest({
    draw,
    start,
    length,
    search,
    order,
    columns,
    ...(Object.keys(customFilters).length > 0 ? { customFilters } : {}),
  });
}

export async function parseDataTableRequestFromBody(request: Request): Promise<DataTableRequest> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new DataTableRequestError(); }
  return validateRequest(body);
}
