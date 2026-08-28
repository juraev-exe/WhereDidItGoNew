<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, EyeOff, Sparkles } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()
const { t } = useI18n()
const settings = useSettingsStore()

const draftKey = ref(settings.aiApiKey)
const showKey = ref(false)

async function toggleEnabled() {
  const next = !settings.aiEnabled
  if (next && !settings.aiApiKey && !draftKey.value.trim()) {
    emit('notify', t('ai.needKeyFirst'))
    return
  }
  await settings.setAiEnabled(next)
}

async function saveKey() {
  await settings.setAiApiKey(draftKey.value)
  emit('notify', t('ai.keySaved'))
}
</script>

<template>
  <div class="subpage">
    <div class="subpage-header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('ai.title') }}</h2>
    </div>

    <section class="card" aria-labelledby="ai-title">
      <div class="header">
        <div class="title-row">
          <Sparkles :size="20" class="icon" />
          <h2 id="ai-title" class="section-title">{{ t('ai.title') }}</h2>
        </div>
        <p class="section-desc">{{ t('ai.description') }}</p>
      </div>

      <label class="field-label" for="ai-api-key">{{ t('ai.apiKeyLabel') }}</label>
      <div class="key-row">
        <input
          id="ai-api-key"
          v-model="draftKey"
          :type="showKey ? 'text' : 'password'"
          class="key-input"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('ai.apiKeyPlaceholder')"
        />
        <button
          type="button"
          class="key-toggle"
          :aria-label="showKey ? t('ai.hideKey') : t('ai.showKey')"
          @click="showKey = !showKey"
        >
          <EyeOff v-if="showKey" :size="18" />
          <Eye v-else :size="18" />
        </button>
      </div>
      <AppButton size="sm" variant="tonal" :disabled="draftKey.trim() === settings.aiApiKey" @click="saveKey">
        {{ t('ai.saveKey') }}
      </AppButton>

      <div class="enable-row">
        <div class="enable-text">
          <span class="enable-title">{{ t('ai.enableLabel') }}</span>
          <span class="enable-hint">{{ t('ai.enableHint') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.aiEnabled }"
          role="switch"
          :aria-checked="settings.aiEnabled"
          :aria-label="t('ai.enableLabel')"
          @click="toggleEnabled"
        />
      </div>

      <p class="disclaimer">{{ t('ai.disclaimer') }}</p>
    </section>
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

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.icon {
  color: var(--color-primary);
}

.section-title {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

.section-desc {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.field-label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-on-surface);
}

.key-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: 0 var(--space-2) 0 var(--space-3);
}

.key-input {
  flex: 1;
  min-height: var(--touch-min);
  border: none;
  background: transparent;
  color: var(--color-on-surface);
  font-size: var(--text-body);
  font-family: var(--font-mono, monospace);
}

.key-input:focus {
  outline: none;
}

.key-toggle {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}

.enable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}

.enable-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.enable-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
}

.enable-hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.switch {
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.switch--on {
  background: var(--color-primary);
}

.switch--on::after {
  transform: translateX(20px);
}

.disclaimer {
  font-size: var(--text-caption);
  color: var(--color-muted);
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}
</style>
