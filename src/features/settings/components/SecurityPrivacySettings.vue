<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from '@lucide/vue'
import PrivacySettings from './PrivacySettings.vue'
import SecuritySettings from './SecuritySettings.vue'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="subpage">
    <div class="subpage-header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.securityPrivacyTitle', 'Security & Privacy') }}</h2>
    </div>

    <SecuritySettings embedded @notify="(msg) => emit('notify', msg)" />
    <PrivacySettings embedded @notify="(msg) => emit('notify', msg)" />
  </div>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.subpage-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy);
}

.back-btn:active {
  transform: scale(0.92);
}

.subpage-header h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
}
</style>
