import type { DataTableRequest } from '../types.js';

export function parseDataTableRequest(params: URLSearchParams): DataTableRequest {
  const draw = parseInt(params.get('draw') ?? '1', 10);
  const start = parseInt(params.get('start') ?? '0', 10);
  const length = parseInt(params.get('length') ?? '15', 10);

  const search = {
    value: params.get('search[value]') ?? '',
    regex: params.get('search[regex]') === 'true',
  };

  const order: DataTableRequest['order'] = [];
  let orderIdx = 0;
  while (params.has(`order[${orderIdx}][column]`)) {
    order.push({
      column: parseInt(params.get(`order[${orderIdx}][column]`) ?? '0', 10),
      dir: (params.get(`order[${orderIdx}][dir]`) ?? 'asc') as 'asc' | 'desc',
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

  return { draw, start, length, search, order, columns };
}

export async function parseDataTableRequestFromBody(request: Request): Promise<DataTableRequest> {
  const body = await request.json();
  return body as DataTableRequest;
}
