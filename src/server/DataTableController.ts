import { Controller } from '@beeblock/svelar/routing';
import type { DataTableResponse } from '../types.js';
import { DataTableService, type DataTableServiceOptions } from './DataTableService.js';
import { DataTableRequestError, parseDataTableRequest, parseDataTableRequestFromBody } from './DataTableRequest.js';

export class DataTableController extends Controller {
  private _model: any;
  private _options?: DataTableServiceOptions;

  constructor(model: any, options?: DataTableServiceOptions) {
    super();
    this._model = model;
    this._options = options;
  }

  async query(event: any): Promise<Response> {
    try {
      const service = new DataTableService(this._model, this._options);
      let request;

      if (event.request.method === 'POST') {
        request = await parseDataTableRequestFromBody(event.request);
      } else {
        request = parseDataTableRequest(event.url.searchParams);
      }

      if (this._options?.filters && event.url?.searchParams) {
        const filters: Record<string, string> = {};
        for (const name of Object.keys(this._options.filters)) {
          const value = event.url.searchParams.get(`filters[${name}]`) ?? event.url.searchParams.get(name);
          if (value !== null) filters[name] = value;
        }
        service.applyFilters(filters);
      }

      const response = await service.process(request);
      return this.json(response, response.error ? 500 : 200);
    } catch (err: any) {
      const errorResponse: DataTableResponse = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        error: err instanceof DataTableRequestError ? err.message : 'Unable to load table data.',
      };
      return this.json(errorResponse, err instanceof DataTableRequestError ? 400 : 500);
    }
  }
}
