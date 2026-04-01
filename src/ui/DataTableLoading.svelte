<script lang="ts">
  interface Props {
    text?: string;
    colSpan?: number;
  }
  let { text = 'Loading...', colSpan = 1 }: Props = $props();
</script>

<tr class="sdt-loading-row">
  <td colspan={colSpan} class="sdt-loading-cell">
    <div class="sdt-loading-content">
      <svg class="sdt-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>
      <span>{text}</span>
    </div>
  </td>
</tr>

<style>
  .sdt-loading-row {
    height: 120px;
  }
  .sdt-loading-cell {
    text-align: center;
    padding: 2rem;
    color: var(--sdt-text-muted, #6b7280);
  }
  .sdt-loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .sdt-spinner {
    width: 1.25rem;
    height: 1.25rem;
    animation: sdt-spin 0.75s linear infinite;
  }
  @keyframes sdt-spin {
    to { transform: rotate(360deg); }
  }
</style>
