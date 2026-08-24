<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty">
    <div class="empty-art" aria-hidden="true">
      <slot name="icon" />
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <button v-if="actionLabel" type="button" class="empty-action" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  color: var(--color-on-surface-variant);
}

.empty-art {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-2);
  animation: popIn var(--duration-entrance) var(--ease-spring) both,
             gentleBounce 2.5s ease-in-out 1s infinite;
}

h3 {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

p {
  max-width: 28ch;
  font-size: var(--text-body);
}

.empty-action {
  margin-top: var(--space-2);
  min-height: var(--touch-min);
  padding: 0 var(--space-5);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  transition:
    transform var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
  animation-delay: 200ms;
}

.empty-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.empty-action:active {
  transform: scale(0.96);
  box-shadow: none;
}

.empty-action:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
