import { afterEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { exportExcel } from '../src/export/excel.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Excel export', () => {
  it('loads the actual ExcelJS CommonJS export and downloads a workbook with visible columns', async () => {
    let exported: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { exported = blob as Blob; return 'blob:fixture'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchor = { click: vi.fn(), href: '', download: '' };
    vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn(), removeChild: vi.fn() } });
    await exportExcel([{ name: 'Alice', secret: 'hidden' }], [{key:'name',header:'Name'},{key:'secret',header:'Secret',visible:false}], 'rows.xlsx');
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('rows.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await exported!.arrayBuffer()));
    expect(workbook.worksheets[0].getRow(1).values).toEqual([undefined, 'Name']);
    expect(workbook.worksheets[0].getRow(2).values).toEqual([undefined, 'Alice']);
  });
});
