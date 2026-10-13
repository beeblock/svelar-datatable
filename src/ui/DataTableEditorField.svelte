<script lang="ts">
  import type { EditorFieldDef, DataTableStore } from '../index.ts';

  interface Props {
    field: EditorFieldDef;
    store: DataTableStore;
  }
  let { field, store }: Props = $props();

  // svelte-ignore state_referenced_locally

  let state = $state(store.getState());
  $effect(() => {
    return store.subscribe(() => {
      state = store.getState();
    });
  });

  let value = $derived(state.formData[field.name] ?? field.defaultValue ?? '');
  let error = $derived(state.validationErrors[field.name]);
  let visible = $derived(field.showWhen ? field.showWhen(state.formData) : true);

  function handleChange(val: any) {
    store.setFormField(field.name, val);
  }
</script>

{#if visible}
  <div class="sdt-editor-field" class:sdt-editor-field-error={!!error}>
    {#if field.type !== 'hidden'}
      <label class="sdt-editor-label" for="sdt-field-{field.name}">
        {field.label}
        {#if field.required}<span class="sdt-required">*</span>{/if}
      </label>
    {/if}

    {#if field.type === 'text' || field.type === 'number' || field.type === 'date' || field.type === 'datetime'}
      <input
        id="sdt-field-{field.name}"
        type={field.type === 'datetime' ? 'datetime-local' : field.type}
        class="sdt-editor-input {field.className ?? ''}"
        value={value}
        placeholder={field.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}
        disabled={field.disabled}
        required={field.required}
        oninput={(e) => handleChange((e.target as HTMLInputElement).value)}
      />
    {:else if field.type === 'textarea'}
      <textarea
        id="sdt-field-{field.name}"
        class="sdt-editor-input sdt-editor-textarea {field.className ?? ''}"
        value={value}
        placeholder={field.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}
        disabled={field.disabled}
        required={field.required}
        oninput={(e) => handleChange((e.target as HTMLTextAreaElement).value)}
        rows="3"
      ></textarea>
    {:else if field.type === 'select'}
      <select
        id="sdt-field-{field.name}"
        class="sdt-editor-input {field.className ?? ''}"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}
        disabled={field.disabled}
        required={field.required}
        onchange={(e) => handleChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">{field.placeholder ?? 'Select...'}</option>
        {#each field.options ?? [] as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    {:else if field.type === 'multi-select'}
      <select
        id="sdt-field-{field.name}"
        class="sdt-editor-input {field.className ?? ''}"
        multiple
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}
        disabled={field.disabled}
        onchange={(e) => {
          const selected = Array.from((e.target as HTMLSelectElement).selectedOptions).map(o => o.value);
          handleChange(selected);
        }}
      >
        {#each field.options ?? [] as opt}
          <option value={opt.value} selected={Array.isArray(value) && value.includes(opt.value)}>{opt.label}</option>
        {/each}
      </select>
    {:else if field.type === 'checkbox'}
      <label class="sdt-editor-checkbox">
        <input
          id="sdt-field-{field.name}"
          type="checkbox"
          checked={!!value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}
          disabled={field.disabled}
          onchange={(e) => handleChange((e.target as HTMLInputElement).checked)}
        />
        <span>{field.placeholder ?? field.label}</span>
      </label>
    {:else if field.type === 'radio'}
      <div class="sdt-editor-radios" role="radiogroup" aria-label={field.label} aria-invalid={error ? true : undefined} aria-describedby={error ? `sdt-field-${field.name}-error` : undefined}>
        {#each field.options ?? [] as opt}
          <label class="sdt-editor-radio">
            <input
              type="radio"
              name="sdt-field-{field.name}"
              value={opt.value}
              checked={value === opt.value}
              disabled={field.disabled}
              onchange={() => handleChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        {/each}
      </div>
    {:else if field.type === 'readonly'}
      <div class="sdt-editor-readonly">{value}</div>
    {:else if field.type === 'hidden'}
      <input type="hidden" value={value} />
    {/if}

    {#if error}
      <span id="sdt-field-{field.name}-error" class="sdt-editor-error">{error}</span>
    {/if}
  </div>
{/if}

<style>
  .sdt-editor-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }
  .sdt-editor-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--sdt-text, #111827);
  }
  .sdt-required {
    color: #ef4444;
    margin-left: 0.125rem;
  }
  .sdt-editor-input {
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--sdt-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: var(--sdt-input-bg, #fff);
    color: var(--sdt-text, #111827);
    outline: none;
    transition: border-color 0.15s;
  }
  .sdt-editor-input:focus {
    border-color: var(--sdt-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--sdt-primary-ring, rgba(59, 130, 246, 0.2));
  }
  .sdt-editor-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .sdt-editor-textarea {
    resize: vertical;
    min-height: 4rem;
  }
  .sdt-editor-checkbox,
  .sdt-editor-radio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .sdt-editor-radios {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .sdt-editor-readonly {
    padding: 0.5rem 0.625rem;
    background: var(--sdt-hover, #f3f4f6);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: var(--sdt-text-muted, #6b7280);
  }
  .sdt-editor-error {
    font-size: 0.75rem;
    color: #ef4444;
  }
  .sdt-editor-field-error .sdt-editor-input {
    border-color: #ef4444;
  }
</style>
