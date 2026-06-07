import type { DataTableRequest } from '../types.js';

function integerParam(value: string | null, fallback: number, min = 0): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function sortDirection(value: string | null): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc';
}

export function parseDataTableRequest(params: URLSearchParams): DataTableRequest {
  const draw = integerParam(params.get('draw'), 1, 1);
  const start = integerParam(params.get('start'), 0, 0);
  const length = integerParam(params.get('length'), 15, 1);

  const search = {
    value: params.get('search[value]') ?? '',
    regex: params.get('search[regex]') === 'true',
  };

  const order: DataTableRequest['order'] = [];
  let orderIdx = 0;
  while (params.has(`order[${orderIdx}][column]`)) {
    order.push({
      column: integerParam(params.get(`order[${orderIdx}][column]`), 0, 0),
      dir: sortDirection(params.get(`order[${orderIdx}][dir]`)),
    });
    orderIdx++;
  }

  const columns: DataTableRequest['columns'] = [];
  let colIdx = 0;
  while (params.has(`columns[${colIdx}][data]`)) {
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
      customFilters[match[1]] = value;
    }
  }

  return {
    draw,
    start,
    length,
    search,
    order,
    columns,
    ...(Object.keys(customFilters).length > 0 ? { customFilters } : {}),
  };
}

export async function parseDataTableRequestFromBody(request: Request): Promise<DataTableRequest> {
  const body = await request.json();
  return body as DataTableRequest;
}
