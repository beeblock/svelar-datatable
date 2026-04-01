<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    row: any;
    colSpan: number;
    expandContent?: Snippet<[{ row: any }]>;
  }
  let { row, colSpan, expandContent }: Props = $props();
</script>

<tr class="sdt-expanded-row">
  <td colspan={colSpan} class="sdt-expanded-cell">
    {#if expandContent}
      {@render expandContent({ row })}
    {:else}
      <pre class="sdt-expanded-default">{JSON.stringify(row, null, 2)}</pre>
    {/if}
  </td>
</tr>

<style>
  .sdt-expanded-row {
    background: var(--sdt-expanded-bg, #f9fafb);
  }
  .sdt-expanded-cell {
    padding: 1rem;
    border-bottom: 1px solid var(--sdt-border, #e5e7eb);
  }
  .sdt-expanded-default {
    margin: 0;
    font-size: 0.75rem;
    color: var(--sdt-text-muted, #6b7280);
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
