<script lang="ts">
  interface Props {
    text?: string;
    colSpan?: number;
  }
  let { text = 'No data available', colSpan = 1 }: Props = $props();
</script>

<tr class="sdt-empty-row">
  <td colspan={colSpan} class="sdt-empty-cell">
    <div class="sdt-empty-content">
      <svg class="sdt-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4" />
      </svg>
      <span>{text}</span>
    </div>
  </td>
</tr>

<style>
  .sdt-empty-row {
    height: 120px;
  }
  .sdt-empty-cell {
    text-align: center;
    padding: 2rem;
    color: var(--sdt-text-muted, #6b7280);
  }
  .sdt-empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .sdt-empty-icon {
    width: 2rem;
    height: 2rem;
    opacity: 0.5;
  }
</style>
