<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'filled' | 'tonal' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'filled',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
  },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--touch-min);
  border-radius: var(--radius-full);
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  border: none;
  transition:
    transform var(--duration-fast) var(--ease-spring-snappy),
    background var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard);
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: scale(0.95) translateY(0);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

.btn--block {
  width: 100%;
}

.btn--sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-label);
}

.btn--md {
  padding: 0 var(--space-5);
  font-size: var(--text-body);
}

.btn--lg {
  min-height: 52px;
  padding: 0 var(--space-6);
  font-size: 1.0625rem;
}

.btn--filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.btn--filled::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    color-mix(in srgb, #fff 24%, transparent) 50%,
    transparent 65%
  );
  background-size: 200% 100%;
  opacity: 0;
  transition: opacity var(--duration-fast);
  pointer-events: none;
}

.btn--filled:hover:not(:disabled)::after {
  opacity: 1;
  animation: shimmer 1.2s ease-in-out;
}

.btn--filled:hover:not(:disabled) {
  box-shadow: 0 6px 20px color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.btn--tonal {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

.btn--tonal:hover:not(:disabled) {
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.btn--outline {
  background: transparent;
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1.5px var(--color-outline-variant);
}

.btn--outline:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--color-primary), 0 2px 8px color-mix(in srgb, var(--color-primary) 16%, transparent);
}

.btn--ghost {
  background: transparent;
  color: var(--color-on-surface);
}

.btn--ghost:hover:not(:disabled) {
  background: var(--color-surface-container);
}

.btn--danger {
  background: var(--color-error);
  color: var(--color-on-error);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-error) 28%, transparent);
}

.btn--danger:hover:not(:disabled) {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-error) 40%, transparent);
}
</style>
