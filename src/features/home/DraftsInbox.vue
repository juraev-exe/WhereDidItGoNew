<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Plus,
  Sparkles,
  Trash2,
  X,
} from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { useDraftsStore } from '@/stores/drafts'
import { useCategoriesStore } from '@/stores/categories'
import { parseBankNotification } from '@/services/smsParser'
import { tickFeedback, successFeedback, warningFeedback } from '@/services/native/haptics'
import type { DraftTransaction } from '@/types/finance'

const { t } = useI18n()
const draftsStore = useDraftsStore()
const categories = useCategoriesStore()

const isExpanded = ref(true)
const pasteModalOpen = ref(false)
const rawInput = ref('')
const senderInput = ref('')
const pasteError = ref('')

onMounted(async () => {
  if (!draftsStore.loaded) {
    await draftsStore.loadDrafts()
  }
})

const pendingCount = computed(() => draftsStore.drafts.length)

function getCategoryName(catId?: string): string {
  if (!catId) return t('quickAdd.uncategorized') || 'Uncategorized'
  return categories.byId(catId)?.name ?? (t('quickAdd.uncategorized') || 'Uncategorized')
}

function getCategoryColor(catId?: string): string {
  if (!catId) return 'var(--color-outline)'
  return categories.byId(catId)?.color ?? 'var(--color-outline)'
}

async function handleConfirm(draft: DraftTransaction) {
  await draftsStore.confirmDraft(draft.id)
  void successFeedback()
}

async function handleDiscard(draft: DraftTransaction) {
  await draftsStore.discardDraft(draft.id)
  void warningFeedback()
}

function openPasteModal() {
  pasteError.value = ''
  rawInput.value = ''
  senderInput.value = ''
  pasteModalOpen.value = true
  void tickFeedback()
}

function closePasteModal() {
  pasteModalOpen.value = false
  void tickFeedback()
}

async function parseAndAdd() {
  pasteError.value = ''
  if (!rawInput.value.trim()) {
    pasteError.value = t('home.pasteErrorEmpty', 'Please paste a bank notification or SMS text')
    return
  }

  const parsed = parseBankNotification(rawInput.value, senderInput.value || undefined)
  if (!parsed) {
    pasteError.value = t('home.pasteErrorInvalid', 'Could not detect an amount or bank transaction in this text')
    return
  }

  await draftsStore.ingestBankMessage(parsed)
  pasteModalOpen.value = false
  void successFeedback()
}

function loadSample(sampleType: 'alif' | 'chase' | 'tinkoff') {
  if (sampleType === 'alif') {
    senderInput.value = 'Alif Bank'
    rawInput.value = 'Pokupka: 78.50 TJS v "Paykar Supermarket". Balans: 350.00 TJS'
  } else if (sampleType === 'chase') {
    senderInput.value = 'Chase Alert'
    rawInput.value = 'Chase: Your debit card was charged $34.20 at WHOLE FOODS MARKET.'
  } else if (sampleType === 'tinkoff') {
    senderInput.value = 'T-Bank'
    rawInput.value = 'Pokupka 850 RUB v Yandex Go. Karta *4821. Balans: 14200 RUB'
  }
  pasteError.value = ''
  void tickFeedback()
}
</script>

<template>
  <section v-if="pendingCount > 0 || pasteModalOpen" class="drafts-inbox-section">
    <!-- Main Inbox Card -->
    <div v-if="pendingCount > 0" class="drafts-card surface-glass">
      <div class="drafts-header" @click="isExpanded = !isExpanded; tickFeedback()">
        <div class="header-left">
          <div class="inbox-icon-wrap">
            <Inbox :size="18" class="inbox-icon" />
            <span class="pulse-indicator" />
          </div>
          <div>
            <h3 class="inbox-title">
              {{ t('home.draftsTitle') || 'Bank Message Inbox' }}
              <span class="count-badge">{{ pendingCount }}</span>
            </h3>
            <p class="inbox-subtitle">
              {{ t('home.draftsSubtitle') || '1-tap confirm or dismiss detected bank transactions' }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="icon-btn-ghost"
            :title="t('home.addDraft') || 'Paste SMS'"
            @click.stop="openPasteModal"
          >
            <Plus :size="16" />
          </button>
          <button type="button" class="icon-btn-ghost" :aria-label="isExpanded ? 'Collapse' : 'Expand'">
            <ChevronUp v-if="isExpanded" :size="18" />
            <ChevronDown v-else :size="18" />
          </button>
        </div>
      </div>

      <!-- Drafts List -->
      <div v-if="isExpanded" class="drafts-list">
        <div
          v-for="draft in draftsStore.drafts"
          :key="draft.id"
          class="draft-item"
        >
          <div class="draft-meta">
            <div class="draft-top-row">
              <span class="source-tag">
                {{ draft.rawSender || (draft.source === 'sms' ? 'SMS' : 'Push') }}
              </span>
              <span class="draft-date">{{ draft.date }}</span>
            </div>

            <p class="draft-note">{{ draft.note }}</p>

            <div class="draft-category-row">
              <span class="cat-pill">
                <span class="cat-dot" :style="{ background: getCategoryColor(draft.categoryId) }" />
                {{ getCategoryName(draft.categoryId) }}
              </span>
            </div>
          </div>

          <div class="draft-amount-col">
            <div class="amount-wrap" :class="draft.type">
              <MoneyText :amount="draft.amount" :signed="draft.type" size="md" />
            </div>

            <div class="draft-actions">
              <button
                type="button"
                class="btn-confirm"
                :title="t('common.confirm') || 'Confirm'"
                @click="handleConfirm(draft)"
              >
                <Check :size="16" />
                <span>{{ t('common.confirm') || 'Confirm' }}</span>
              </button>

              <button
                type="button"
                class="btn-discard"
                :title="t('common.discard') || 'Discard'"
                @click="handleDiscard(draft)"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paste / Ingest Modal -->
    <Teleport to="body">
      <div v-if="pasteModalOpen" class="modal-backdrop" @click="closePasteModal">
        <div class="modal-card surface-glass" @click.stop>
          <div class="modal-head">
            <div class="head-title">
              <Sparkles :size="20" class="sparkle-icon" />
              <h4>{{ t('home.pasteBankSms') || 'Ingest Bank SMS / Notification' }}</h4>
            </div>
            <button type="button" class="close-btn" @click="closePasteModal">
              <X :size="18" />
            </button>
          </div>

          <p class="modal-desc">
            {{ t('home.pasteBankDesc', 'Paste raw text copied from your bank push or SMS. WhereDidItGo parses the amount, merchant, and category locally on your device.') }}
          </p>

          <div class="sample-pills">
            <span class="sample-label">{{ t('home.trySample', 'Try sample:') }}</span>
            <button type="button" class="sample-btn" @click="loadSample('alif')">Alif Bank (TJS)</button>
            <button type="button" class="sample-btn" @click="loadSample('chase')">Chase ($ USD)</button>
            <button type="button" class="sample-btn" @click="loadSample('tinkoff')">T-Bank (₽ RUB)</button>
          </div>

          <div class="input-group">
            <label>{{ t('home.senderLabel', 'Sender / Bank Name (Optional)') }}</label>
            <input
              v-model="senderInput"
              type="text"
              placeholder="e.g. Alif Bank, Chase, Eskhata"
              class="text-input"
            />
          </div>

          <div class="input-group">
            <label>{{ t('home.smsBodyLabel', 'Notification / SMS Body') }}</label>
            <textarea
              v-model="rawInput"
              rows="3"
              placeholder="e.g. Pokupka: 45.00 TJS v 'Paykar'. Balans: 120 TJS"
              class="textarea-input"
            />
          </div>

          <p v-if="pasteError" class="error-msg">{{ pasteError }}</p>

          <div class="modal-foot">
            <button type="button" class="btn-secondary" @click="closePasteModal">
              {{ t('common.cancel') || 'Cancel' }}
            </button>
            <button type="button" class="btn-primary" @click="parseAndAdd">
              <Sparkles :size="16" />
              {{ t('home.parseAndDraft') || 'Parse & Add to Inbox' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>

  <!-- Compact Paste SMS trigger button when no drafts pending -->
  <div v-else class="compact-inbox-trigger">
    <button type="button" class="ingest-trigger-btn" @click="openPasteModal">
      <Sparkles :size="14" class="sparkle-icon" />
      <span>{{ t('home.pasteBankSms') || 'Ingest Bank SMS / Push' }}</span>
    </button>
  </div>
</template>

<style scoped>
.drafts-inbox-section {
  margin-bottom: var(--space-4, 1rem);
}

.drafts-card {
  border-radius: var(--radius-xl, 1.25rem);
  padding: 1rem;
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.12));
  background: var(--color-surface-container, rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.2);
}

.drafts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.inbox-icon-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-primary-container, rgba(64, 156, 255, 0.15));
  color: var(--color-primary, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.inbox-title {
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-on-surface, #fff);
  margin: 0;
}

.count-badge {
  font-size: 0.75rem;
  padding: 0.1rem 0.45rem;
  border-radius: 12px;
  background: #10b981;
  color: #fff;
  font-weight: 700;
}

.inbox-subtitle {
  font-size: 0.75rem;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.6));
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-btn-ghost {
  background: transparent;
  border: none;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.6));
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.drafts-list {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: var(--radius-lg, 0.75rem);
  background: var(--color-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.08));
}

.draft-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.draft-top-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-tag {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--color-surface-variant, rgba(255, 255, 255, 0.1));
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: var(--color-primary, #60a5fa);
}

.draft-date {
  font-size: 0.7rem;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.5));
}

.draft-note {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-on-surface, #fff);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.draft-category-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.7));
}

.cat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.draft-amount-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  margin-left: 0.75rem;
}

.amount-wrap {
  font-weight: 700;
}

.amount-wrap.expense {
  color: var(--color-expense, #f87171);
}

.amount-wrap.income {
  color: var(--color-income, #34d399);
}

.draft-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.btn-confirm:active {
  transform: scale(0.96);
}

.btn-discard {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.45rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-discard:active {
  transform: scale(0.96);
}

.compact-inbox-trigger {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.ingest-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  background: var(--color-surface-container, rgba(255, 255, 255, 0.05));
  border: 1px dashed var(--color-outline-variant, rgba(255, 255, 255, 0.15));
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.7));
  cursor: pointer;
  transition: all 0.2s ease;
}

.ingest-trigger-btn:hover {
  background: var(--color-surface-variant, rgba(255, 255, 255, 0.1));
  color: #fff;
}

.sparkle-icon {
  color: #eab308;
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  border-radius: var(--radius-xl, 1.25rem);
  padding: 1.25rem;
  background: var(--color-surface, #1e1e24);
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.15));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.head-title h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.modal-desc {
  font-size: 0.8rem;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.65));
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.sample-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.sample-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.sample-btn {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--color-primary, #60a5fa);
  cursor: pointer;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}

.input-group label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.text-input,
.textarea-input {
  width: 100%;
  padding: 0.6rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}

.text-input:focus,
.textarea-input:focus {
  border-color: var(--color-primary, #3b82f6);
}

.error-msg {
  color: #ef4444;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-secondary {
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  background: var(--color-primary, #3b82f6);
  border: none;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
