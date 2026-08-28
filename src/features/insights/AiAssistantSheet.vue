<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send, Settings2, Sparkles } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { AiChatError, askFinanceQuestion, type AiChatMessage } from '@/services/ai'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; 'open-settings': [] }>()

const { t } = useI18n()
const settings = useSettingsStore()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const accounts = useAccountsStore()

const ready = computed(() => settings.aiEnabled && !!settings.aiApiKey)
const messages = ref<AiChatMessage[]>([])
const draft = ref('')
const loading = ref(false)
const error = ref('')
const listRef = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) error.value = ''
  },
)

function scrollToEnd() {
  requestAnimationFrame(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

async function send() {
  const question = draft.value.trim()
  if (!question || loading.value || !ready.value) return
  messages.value.push({ role: 'user', text: question })
  draft.value = ''
  loading.value = true
  error.value = ''
  await nextTick()
  scrollToEnd()
  try {
    const answer = await askFinanceQuestion(settings.aiApiKey, question, {
      transactions: transactions.transactions,
      categories: categories.categories,
      budgets: budgets.budgets,
      accounts: accounts.accounts,
      currency: settings.currency,
    })
    messages.value.push({ role: 'assistant', text: answer || t('ai.emptyReply') })
  } catch (e) {
    if (e instanceof AiChatError && e.kind === 'auth') error.value = t('ai.errorAuth')
    else if (e instanceof AiChatError && e.kind === 'rateLimit') error.value = t('ai.errorRateLimit')
    else error.value = t('ai.errorGeneric')
  } finally {
    loading.value = false
    await nextTick()
    scrollToEnd()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="t('ai.title')" contain @close="emit('close')">
    <div v-if="!ready" class="disabled-state">
      <Sparkles :size="28" />
      <p>{{ t('ai.notEnabled') }}</p>
      <button type="button" class="settings-link" @click="emit('open-settings')">
        <Settings2 :size="16" />
        {{ t('ai.goToSettings') }}
      </button>
    </div>

    <template v-else>
      <div ref="listRef" class="messages">
        <p v-if="!messages.length" class="hint">{{ t('ai.emptyHint') }}</p>
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="bubble"
          :class="m.role === 'user' ? 'bubble--user' : 'bubble--assistant'"
        >
          {{ m.text }}
        </div>
        <div v-if="loading" class="bubble bubble--assistant bubble--loading">
          <span class="dot" /><span class="dot" /><span class="dot" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <form class="composer" @submit.prevent="send">
        <textarea
          v-model="draft"
          class="input"
          rows="1"
          :placeholder="t('ai.askPlaceholder')"
          :disabled="loading"
          @keydown="onKeydown"
        />
        <button type="submit" class="send-btn" :disabled="loading || !draft.trim()" :aria-label="t('ai.send')">
          <Send :size="18" />
        </button>
      </form>
      <p class="disclaimer">{{ t('ai.disclaimer') }}</p>
    </template>
  </BottomSheet>
</template>

<style scoped>
.disabled-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--color-muted);
}

.settings-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-primary);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-primary-container);
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
}

.hint {
  font-size: var(--text-label);
  color: var(--color-muted);
  padding: var(--space-4) 0;
  text-align: center;
}

.bubble {
  max-width: 88%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-body);
  line-height: 1.45;
  white-space: pre-wrap;
}

.bubble--user {
  align-self: flex-end;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-bottom-right-radius: var(--radius-xs, 4px);
}

.bubble--assistant {
  align-self: flex-start;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border-bottom-left-radius: var(--radius-xs, 4px);
}

.bubble--loading {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-muted);
  animation: pulse 1.2s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.error {
  font-size: var(--text-label);
  color: var(--color-error);
  text-align: center;
}

.composer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}

.input {
  flex: 1;
  resize: none;
  max-height: 96px;
  min-height: var(--touch-min);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-body);
  font-family: inherit;
  border: none;
}

.input:focus {
  outline: none;
}

.send-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.send-btn:disabled {
  opacity: 0.45;
}

.disclaimer {
  font-size: var(--text-caption);
  color: var(--color-muted);
  padding-top: var(--space-2);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .dot {
    animation: none;
  }
}
</style>
