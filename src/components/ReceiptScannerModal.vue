<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Camera,
  Check,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Store,
  X,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { scanReceiptImage, type OcrProgress } from '@/services/receiptOcr'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { confirmFeedback, errorFeedback, successFeedback, tickFeedback } from '@/services/native/haptics'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [data: { amount: number; merchant: string; date: string; categoryId?: string }]
}>()

const { t } = useI18n()
const categories = useCategoriesStore()
const settings = useSettingsStore()

const cameraInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)

type ScanState = 'idle' | 'scanning' | 'result' | 'error'
const state = ref<ScanState>('idle')

const scanProgress = ref(0)
const scanStepText = ref('')
const previewImage = ref<string | null>(null)

// Parsed / Editable Results
const editedMerchant = ref('')
const editedAmountStr = ref('')
const editedDate = ref('')
const selectedCategoryId = ref<string | undefined>(undefined)
const rawExtractedText = ref('')

function resetState() {
  state.value = 'idle'
  scanProgress.value = 0
  scanStepText.value = ''
  previewImage.value = null
  editedMerchant.value = ''
  editedAmountStr.value = ''
  editedDate.value = ''
  selectedCategoryId.value = undefined
  rawExtractedText.value = ''
  if (cameraInput.value) cameraInput.value.value = ''
  if (galleryInput.value) galleryInput.value.value = ''
}

function onClose() {
  resetState()
  emit('close')
}

function triggerCamera() {
  void tickFeedback()
  cameraInput.value?.click()
}

function triggerGallery() {
  void tickFeedback()
  galleryInput.value?.click()
}

async function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  state.value = 'scanning'
  scanProgress.value = 0.05
  scanStepText.value = t('quickAdd.scanReceiptAnalyzing')
  void confirmFeedback()

  try {
    const result = await scanReceiptImage(
      file,
      categories.expense,
      (p: OcrProgress) => {
        scanProgress.value = p.progress
        if (p.status === 'preprocessing') scanStepText.value = 'Optimizing image contrast…'
        else if (p.status === 'recognizing') scanStepText.value = 'Reading receipt characters…'
        else if (p.status === 'parsing') scanStepText.value = 'Extracting amount & store name…'
      },
    )

    previewImage.value = result.previewUrl
    rawExtractedText.value = result.rawText

    const p = result.parsed
    editedMerchant.value = p.merchant || 'Store'
    editedAmountStr.value = p.amount > 0 ? (p.amount / 100).toFixed(2) : ''
    editedDate.value = p.date
    selectedCategoryId.value = p.suggestedCategoryId

    state.value = 'result'
    void successFeedback()
  } catch (err) {
    console.error('[ReceiptScanner] OCR failed:', err)
    state.value = 'error'
    void errorFeedback()
  }
}

function applyToTransaction() {
  const numericAmount = parseFloat(editedAmountStr.value.replace(',', '.'))
  const minorAmount = Number.isFinite(numericAmount) && numericAmount > 0
    ? Math.round(numericAmount * 100)
    : 0

  emit('apply', {
    amount: minorAmount,
    merchant: editedMerchant.value.trim() || 'Store',
    date: editedDate.value || new Date().toISOString().slice(0, 10),
    categoryId: selectedCategoryId.value,
  })

  void successFeedback()
  onClose()
}
</script>

<template>
  <BottomSheet :open="open" :title="t('quickAdd.scanReceipt')" @close="onClose">
    <div class="receipt-scanner-container">
      <!-- Hidden file inputs for Camera & Gallery -->
      <input
        ref="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden-input"
        @change="handleFileSelect"
      />
      <input
        ref="galleryInput"
        type="file"
        accept="image/*"
        class="hidden-input"
        @change="handleFileSelect"
      />

      <!-- STATE: IDLE (Choose Capture Mode) -->
      <div v-if="state === 'idle'" class="idle-view">
        <div class="scanner-hero">
          <div class="hero-icon-bubble">
            <Camera class="hero-icon" />
            <div class="sparkle-ring">
              <Sparkles class="sparkle-icon" />
            </div>
          </div>
          <h3 class="hero-title">{{ t('quickAdd.scanReceipt') }}</h3>
          <p class="hero-desc">
            {{ t('quickAdd.scanReceiptSubtitle') }}
          </p>
        </div>

        <div class="action-grid">
          <button type="button" class="action-card primary" @click="triggerCamera">
            <div class="action-icon-box">
              <Camera class="action-icon" />
            </div>
            <div class="action-meta">
              <span class="action-label">{{ t('quickAdd.scanReceiptCamera') }}</span>
              <span class="action-sub">Snap photo with camera</span>
            </div>
          </button>

          <button type="button" class="action-card secondary" @click="triggerGallery">
            <div class="action-icon-box">
              <ImageIcon class="action-icon" />
            </div>
            <div class="action-meta">
              <span class="action-label">{{ t('quickAdd.scanReceiptGallery') }}</span>
              <span class="action-sub">Select from album / files</span>
            </div>
          </button>
        </div>
      </div>

      <!-- STATE: SCANNING (Animated Optical Viewfinder) -->
      <div v-else-if="state === 'scanning'" class="scanning-view">
        <div class="scanner-viewfinder">
          <div class="viewfinder-frame">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
            <!-- Laser scan beam line -->
            <div class="laser-beam"></div>
            <FileText class="viewfinder-icon" />
          </div>
        </div>

        <div class="scanning-status">
          <h4 class="status-title">{{ t('quickAdd.scanReceiptAnalyzing') }}</h4>
          <p class="status-sub">{{ scanStepText }}</p>
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: `${Math.round(scanProgress * 100)}%` }"
            ></div>
          </div>
          <span class="progress-num">{{ Math.round(scanProgress * 100) }}%</span>
        </div>
      </div>

      <!-- STATE: RESULT (Extracted Data & Confirmation) -->
      <div v-else-if="state === 'result'" class="result-view">
        <div class="result-header">
          <div class="success-badge">
            <Check class="badge-icon" />
            <span>{{ t('quickAdd.scanReceiptDetected') }}</span>
          </div>
          <button type="button" class="retake-btn" @click="resetState">
            <RotateCcw class="retake-icon" />
            <span>{{ t('quickAdd.scanReceiptRetake') }}</span>
          </button>
        </div>

        <!-- Form fields to review and edit -->
        <div class="extracted-card">
          <!-- Total Amount Field -->
          <div class="field-row">
            <label class="field-label">{{ t('quickAdd.scanReceiptTotal') }}</label>
            <div class="amount-input-box">
              <span class="curr-sign">{{ settings.currencySymbol }}</span>
              <input
                v-model="editedAmountStr"
                type="text"
                inputmode="decimal"
                class="field-input amount-val"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Merchant Field -->
          <div class="field-row">
            <label class="field-label">{{ t('quickAdd.scanReceiptStore') }}</label>
            <div class="input-with-icon">
              <Store class="input-icon" />
              <input
                v-model="editedMerchant"
                type="text"
                class="field-input text-val"
                placeholder="Store Name"
              />
            </div>
          </div>

          <!-- Date Field -->
          <div class="field-row">
            <label class="field-label">{{ t('quickAdd.scanReceiptDate') }}</label>
            <input
              v-model="editedDate"
              type="date"
              class="field-input text-val"
            />
          </div>

          <!-- Category Selection -->
          <div class="field-row">
            <label class="field-label">{{ t('quickAdd.scanReceiptCategory') }}</label>
            <select v-model="selectedCategoryId" class="field-select">
              <option :value="undefined">-- Select Category --</option>
              <option
                v-for="cat in categories.expense"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Apply Button -->
        <AppButton
          variant="filled"
          class="apply-btn"
          @click="applyToTransaction"
        >
          <Check class="btn-icon" />
          {{ t('quickAdd.scanReceiptUseData') }}
        </AppButton>
      </div>

      <!-- STATE: ERROR (Retry Screen) -->
      <div v-else-if="state === 'error'" class="error-view">
        <div class="error-bubble">
          <X class="error-icon" />
        </div>
        <h4 class="error-title">{{ t('quickAdd.scanReceiptError') }}</h4>
        <div class="error-actions">
          <AppButton variant="tonal" @click="resetState">
            <RotateCcw class="btn-icon" />
            {{ t('quickAdd.scanReceiptRetake') }}
          </AppButton>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.receipt-scanner-container {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 1rem 1.5rem;
  min-height: 280px;
}

.hidden-input {
  display: none;
}

/* Idle View */
.idle-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem 0;
}

.scanner-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
}

.hero-icon-bubble {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb, 14, 165, 233), 0.18), rgba(var(--color-primary-rgb, 14, 165, 233), 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border: 1px solid rgba(var(--color-primary-rgb, 14, 165, 233), 0.25);
  box-shadow: 0 8px 24px -4px rgba(var(--color-primary-rgb, 14, 165, 233), 0.25);
}

.hero-icon {
  width: 38px;
  height: 38px;
  color: var(--color-primary, #0ea5e9);
}

.sparkle-ring {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-primary, #0ea5e9);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.sparkle-icon {
  width: 14px;
  height: 14px;
}

.hero-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color, #1e293b);
  margin: 0 0 0.4rem;
}

.hero-desc {
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  margin: 0;
  max-width: 280px;
  line-height: 1.4;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  width: 100%;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.2rem 0.85rem;
  border-radius: 18px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.action-card:active {
  transform: scale(0.97);
}

.action-card.primary {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb, 14, 165, 233), 0.1), rgba(var(--color-primary-rgb, 14, 165, 233), 0.02));
  border-color: rgba(var(--color-primary-rgb, 14, 165, 233), 0.35);
}

.action-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--bg-surface, #f8fafc);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.action-card.primary .action-icon-box {
  background: var(--color-primary, #0ea5e9);
  color: white;
}

.action-icon {
  width: 22px;
  height: 22px;
}

.action-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-label {
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--text-color, #1e293b);
  margin-bottom: 0.15rem;
}

.action-sub {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  text-align: center;
}

/* Scanning Viewfinder */
.scanning-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0 1rem;
}

.scanner-viewfinder {
  position: relative;
  width: 140px;
  height: 140px;
  margin-bottom: 1.5rem;
}

.viewfinder-frame {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: rgba(var(--color-primary-rgb, 14, 165, 233), 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.viewfinder-icon {
  width: 52px;
  height: 52px;
  color: var(--color-primary, #0ea5e9);
  opacity: 0.35;
}

.corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 3px solid var(--color-primary, #0ea5e9);
}

.corner.top-left {
  top: 4px;
  left: 4px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 6px;
}
.corner.top-right {
  top: 4px;
  right: 4px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 6px;
}
.corner.bottom-left {
  bottom: 4px;
  left: 4px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 6px;
}
.corner.bottom-right {
  bottom: 4px;
  right: 4px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 6px;
}

.laser-beam {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-primary, #0ea5e9), transparent);
  box-shadow: 0 0 12px 2px var(--color-primary, #0ea5e9);
  animation: scan-vertical 1.6s ease-in-out infinite alternate;
}

@keyframes scan-vertical {
  0% {
    top: 5%;
  }
  100% {
    top: 92%;
  }
}

.scanning-status {
  width: 100%;
  max-width: 280px;
  text-align: center;
}

.status-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--text-color, #1e293b);
}

.status-sub {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
  margin: 0 0 0.85rem;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.4rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary, #0ea5e9), #38bdf8);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.progress-num {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-primary, #0ea5e9);
}

/* Result View */
.result-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.success-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.retake-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.retake-icon {
  width: 14px;
  height: 14px;
}

.extracted-card {
  background: var(--bg-surface-elevated, #f8fafc);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 18px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.amount-input-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  padding: 0.4rem 0.75rem;
}

.curr-sign {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary, #0ea5e9);
}

.amount-val {
  font-size: 1.4rem;
  font-weight: 700;
  border: none;
  outline: none;
  width: 100%;
  color: var(--text-color, #1e293b);
  background: transparent;
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
}

.input-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted, #94a3b8);
}

.field-input.text-val {
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.95rem;
  color: var(--text-color, #1e293b);
  background: transparent;
}

.field-select {
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  font-size: 0.92rem;
  color: var(--text-color, #1e293b);
  outline: none;
}

.apply-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  padding: 0.85rem;
  border-radius: 14px;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Error View */
.error-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 0;
}

.error-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.error-icon {
  width: 32px;
  height: 32px;
}

.error-title {
  font-size: 0.95rem;
  color: var(--text-color, #1e293b);
  max-width: 260px;
  margin: 0 0 1.25rem;
  line-height: 1.4;
}
</style>
