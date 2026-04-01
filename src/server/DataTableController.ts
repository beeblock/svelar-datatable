import type { DataTableResponse } from '../types.js';
import { DataTableService, type DataTableServiceOptions } from './DataTableService.js';
import { parseDataTableRequest, parseDataTableRequestFromBody } from './DataTableRequest.js';

export class DataTableController {
  static async handle(
    event: any,
    model: any,
    options?: DataTableServiceOptions,
  ): Promise<Response> {
    try {
      const service = new DataTableService(model, options);
      let request;

      if (event.request.method === 'POST') {
        request = await parseDataTableRequestFromBody(event.request);
      } else {
        request = parseDataTableRequest(event.url.searchParams);
      }

      const response = await service.process(request);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      const errorResponse: DataTableResponse = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        error: err.message ?? 'Internal server error',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
