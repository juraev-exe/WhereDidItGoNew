<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'

/**
 * In-app replacement for `window.confirm`. The native dialog blocks the JS thread,
 * ignores the app's theme and looks foreign inside a Capacitor WebView.
 */
withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Renders the primary action in the danger colour. */
    destructive?: boolean
    /** Hides the cancel action — use for acknowledge-only messages. */
    acknowledgeOnly?: boolean
  }>(),
  {
    message: '',
    confirmLabel: '',
    cancelLabel: '',
    destructive: false,
    acknowledgeOnly: false,
  },
)

const emit = defineEmits<{ confirm: []; close: [] }>()
const { t } = useI18n()

function confirm() {
  emit('confirm')
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="emit('close')">
    <div class="confirm">
      <p v-if="message" class="message">{{ message }}</p>
      <AppButton
        block
        size="lg"
        :variant="destructive ? 'danger' : 'filled'"
        @click="confirm"
      >
        {{ confirmLabel || (acknowledgeOnly ? t('common.close') : t('common.confirm')) }}
      </AppButton>
      <AppButton v-if="!acknowledgeOnly" block variant="ghost" @click="emit('close')">
        {{ cancelLabel || t('common.cancel') }}
      </AppButton>
    </div>
  </BottomSheet>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
}

.message {
  font-size: var(--text-body);
  line-height: var(--leading-normal);
  color: var(--color-on-surface-variant);
}
</style>
