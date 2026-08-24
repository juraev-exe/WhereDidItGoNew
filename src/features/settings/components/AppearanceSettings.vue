<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check } from '@lucide/vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { APP_LOCALES } from '@/i18n'
import { tickFeedback, toggleOffFeedback, toggleOnFeedback } from '@/services/native/haptics'
import { useSettingsStore } from '@/stores/settings'
import type { AppLocale, ColorScheme, ThemeMode } from '@/types/finance'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const COLOR_SCHEMES: { id: ColorScheme; label: string; gradient: string; color: string }[] = [
  { id: 'teal', label: 'Emerald Teal', gradient: 'linear-gradient(135deg, #0b6e6a, #2a9d8f)', color: '#0b6e6a' },
  { id: 'blue', label: 'Ocean Blue', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#2563eb' },
  { id: 'purple', label: 'Royal Purple', gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)', color: '#7c3aed' },
  { id: 'rose', label: 'Rose Coral', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', color: '#e11d48' },
  { id: 'amber', label: 'Sunset Amber', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#d97706' },
  { id: 'obsidian', label: 'Obsidian Slate', gradient: 'linear-gradient(135deg, #374151, #6b7280)', color: '#475569' },
]

const languageOptions = computed(() =>
  APP_LOCALES.map((code) => ({
    value: code,
    label: t(`languages.${code}`),
  })),
)

async function onTheme(mode: ThemeMode) {
  if (settings.theme === mode) return
  await settings.setTheme(mode)
  if (mode === 'dark') void toggleOnFeedback()
  else void toggleOffFeedback()
}

async function onColorScheme(scheme: ColorScheme) {
  if (settings.colorScheme === scheme) return
  void tickFeedback()
  await settings.setColorScheme(scheme)
}

async function onLocale(code: string) {
  await settings.setLocale(code as AppLocale)
}
</script>

<template>
  <div class="subpage">
    <div class="subpage-header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.appearance', 'Styles & Appearance') }}</h2>
    </div>

    <section class="card" aria-labelledby="appearance-title">
      <div class="field">
        <span id="theme-label" class="label">{{ t('settings.themeMode', 'Theme mode') }}</span>
      <div class="segmented" role="radiogroup" aria-labelledby="theme-label">
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'light' }"
          :aria-checked="settings.theme === 'light'"
          @click="onTheme('light')"
        >
          {{ t('themes.light') }}
        </button>
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'dark' }"
          :aria-checked="settings.theme === 'dark'"
          @click="onTheme('dark')"
        >
          {{ t('themes.dark') }}
        </button>
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'oled' }"
          :aria-checked="settings.theme === 'oled'"
          @click="onTheme('oled')"
        >
          {{ t('themes.oled') }}
        </button>
      </div>
    </div>

    <!-- Color Scheme & Gradient Selector -->
    <div class="field">
      <span class="label">Color Scheme</span>
      <div class="color-schemes-grid">
        <button
          v-for="s in COLOR_SCHEMES"
          :key="s.id"
          type="button"
          class="scheme-btn"
          :class="{ 'scheme-btn--active': settings.colorScheme === s.id }"
          :style="{ '--swatch-color': s.color }"
          :aria-label="s.label"
          :title="s.label"
          @click="onColorScheme(s.id)"
        >
          <span class="scheme-preview" :style="{ background: s.gradient }">
            <Check v-if="settings.colorScheme === s.id" :size="16" class="scheme-check" />
          </span>
          <span class="scheme-label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <label class="field">
      <span class="label">{{ t('settings.language') }}</span>
      <AppSelect
        :model-value="settings.locale"
        :options="languageOptions"
        :aria-label="t('settings.language')"
        @update:model-value="onLocale"
      />
    </label>
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
  gap: var(--space-4);
}

.section-title {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg-btn {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-spring-snappy);
}

.seg-btn:active {
  transform: scale(0.95);
}

.seg-btn--on {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.color-schemes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.scheme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-lg);
  border: 1.5px solid transparent;
  background: var(--color-surface-container);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  position: relative;
}

@media (hover: hover) and (pointer: fine) {
  .scheme-btn:hover {
    background: color-mix(in srgb, var(--swatch-color) 12%, var(--color-surface-container-high));
    border-color: color-mix(in srgb, var(--swatch-color) 40%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--swatch-color) 25%, transparent);
  }
}

.scheme-btn:active {
  transform: scale(0.96) translateY(0);
}

.scheme-btn--active {
  border-color: var(--swatch-color);
  background: color-mix(in srgb, var(--swatch-color) 16%, var(--color-surface-container));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--swatch-color) 25%, transparent), 0 4px 12px color-mix(in srgb, var(--swatch-color) 28%, transparent);
}

.scheme-preview {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-spring);
}

.scheme-btn--active .scheme-preview {
  transform: scale(1.08);
}

.scheme-check {
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
  animation: popSpring 0.3s var(--ease-spring) both;
}

.scheme-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-on-surface);
  text-align: center;
}
</style>
