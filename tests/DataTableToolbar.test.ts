import { readFileSync } from 'node:fs';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/ui/DataTableToolbar.svelte', import.meta.url), 'utf8');

describe('DataTableToolbar responsive controls', () => {
  it('bounds and wraps the control group without hiding commands', () => {
    const styles = source.match(/\.sdt-toolbar-right\s*\{([^}]+)\}/)?.[1];
    expect(styles).toContain('flex-wrap: wrap');
    expect(styles).toContain('flex-shrink: 1');
    expect(styles).toContain('min-width: 0');
    expect(styles).toContain('max-width: 100%');
    expect(styles).not.toMatch(/overflow:\s*hidden|display:\s*none/);
    expect(styles).toContain('gap: 0.5rem');
  });

  it('compiles with export, selection, and editor controls intact', () => {
    const result = compile(source, { filename: 'DataTableToolbar.svelte', generate: 'client' });
    expect(result.warnings).toEqual([]);
    expect(result.css?.code).toMatch(/flex-wrap:\s*wrap/);
    expect(source).toContain('<DataTableButtons');
    expect(source).toContain('<DataTableColumnToggle');
    expect(source).toContain('handleCreate');
    expect(source).toContain('handleEdit');
    expect(source).toContain('onDeleteClick(selected)');
  });
});
