import type { DataTableRequest } from '../types.js';
export declare function parseDataTableRequest(params: URLSearchParams): DataTableRequest;
export declare function parseDataTableRequestFromBody(request: Request): Promise<DataTableRequest>;
