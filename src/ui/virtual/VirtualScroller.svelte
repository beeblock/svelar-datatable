<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    items: any[];
    rowHeight: number;
    containerHeight?: number;
    overscan?: number;
    renderRow: Snippet<[{ item: any; index: number; style: string }]>;
  }
  let {
    items,
    rowHeight,
    containerHeight = 500,
    overscan = 5,
    renderRow,
  }: Props = $props();

  let scrollTop = $state(0);
  let containerEl: HTMLDivElement | undefined = $state();

  let totalHeight = $derived(items.length * rowHeight);

  let visibleStart = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - overscan));
  let visibleEnd = $derived(
    Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)
  );

  let visibleItems = $derived(
    items.slice(visibleStart, visibleEnd).map((item, i) => ({
      item,
      index: visibleStart + i,
      style: `position: absolute; top: ${(visibleStart + i) * rowHeight}px; width: 100%; height: ${rowHeight}px;`,
    }))
  );

  function handleScroll(e: Event) {
    scrollTop = (e.target as HTMLDivElement).scrollTop;
  }
</script>

<div
  class="sdt-virtual-container"
  style="height: {containerHeight}px; overflow-y: auto;"
  onscroll={handleScroll}
  bind:this={containerEl}
>
  <div class="sdt-virtual-spacer" style="height: {totalHeight}px; position: relative;">
    {#each visibleItems as { item, index, style } (index)}
      {@render renderRow({ item, index, style })}
    {/each}
  </div>
</div>

<style>
  .sdt-virtual-container {
    overflow-x: auto;
  }
  .sdt-virtual-spacer {
    width: 100%;
  }
</style>
