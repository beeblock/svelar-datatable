import type { DataTableConfig } from './types.js';
interface DatatablePluginConfig {
    prefix?: string;
    defaults?: Partial<DataTableConfig>;
}
export declare class SvelarDatatablePlugin {
    private _config;
    constructor(config?: DatatablePluginConfig);
    get name(): string;
    get config(): DatatablePluginConfig;
    static defaults(): Partial<DataTableConfig>;
}
export {};
