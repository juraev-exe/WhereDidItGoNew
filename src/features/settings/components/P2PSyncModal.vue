<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckCircle2,
  Copy,
  Laptop,
  Radio,
  Smartphone,
  X,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import { generateQrSvg } from '@/lib/qrcode'
import {
  P2PHostSession,
  P2PClientSession,
  type P2PSyncStatus,
} from '@/services/p2pSync'
import { errorFeedback, successFeedback, tickFeedback } from '@/services/native/haptics'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'synced', count: number): void
}>()

const { t } = useI18n()

type Mode = 'host' | 'client'
const mode = ref<Mode>('host')
const status = ref<P2PSyncStatus>('idle')
const statusDetails = ref('')
const copied = ref(false)

// Host state
let hostSession: P2PHostSession | null = null
const hostOfferCode = ref('')
const hostOfferQrSvg = ref('')
const clientAnswerInput = ref('')

// Client state
let clientSession: P2PClientSession | null = null
const hostOfferInput = ref('')
const clientAnswerCode = ref('')
const clientAnswerQrSvg = ref('')

function resetSessions() {
  hostSession?.close()
  hostSession = null
  clientSession?.close()
  clientSession = null
  status.value = 'idle'
  statusDetails.value = ''
  hostOfferCode.value = ''
  hostOfferQrSvg.value = ''
  clientAnswerInput.value = ''
  hostOfferInput.value = ''
  clientAnswerCode.value = ''
  clientAnswerQrSvg.value = ''
}

async function startHost() {
  resetSessions()
  mode.value = 'host'
  hostSession = new P2PHostSession(
    (s, details) => {
      status.value = s
      if (details) statusDetails.value = details
      if (s === 'complete') {
        void successFeedback()
      } else if (s === 'error') {
        void errorFeedback()
      }
    },
    (stats) => {
      emit('synced', stats.syncedItems)
    },
  )

  try {
    const offer = await hostSession.initOffer()
    hostOfferCode.value = offer
    hostOfferQrSvg.value = await generateQrSvg(offer)
    void tickFeedback()
  } catch (err) {
    status.value = 'error'
    statusDetails.value = err instanceof Error ? err.message : 'Failed to init host'
    void errorFeedback()
  }
}

async function submitAnswerToHost() {
  if (!hostSession || !clientAnswerInput.value.trim()) return
  try {
    await hostSession.acceptAnswer(clientAnswerInput.value.trim())
    void tickFeedback()
  } catch (err) {
    status.value = 'error'
    statusDetails.value = err instanceof Error ? err.message : 'Invalid answer'
    void errorFeedback()
  }
}

async function submitOfferToClient() {
  const offer = hostOfferInput.value.trim()
  if (!offer) return
  resetSessions()
  mode.value = 'client'
  clientSession = new P2PClientSession(
    (s, details) => {
      status.value = s
      if (details) statusDetails.value = details
      if (s === 'complete') {
        void successFeedback()
      } else if (s === 'error') {
        void errorFeedback()
      }
    },
    (stats) => {
      emit('synced', stats.syncedItems)
    },
  )

  try {
    const answer = await clientSession.acceptOfferAndGenerateAnswer(offer)
    clientAnswerCode.value = answer
    clientAnswerQrSvg.value = await generateQrSvg(answer)
    void tickFeedback()
  } catch (err) {
    status.value = 'error'
    statusDetails.value = err instanceof Error ? err.message : 'Failed to process offer'
    void errorFeedback()
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    void tickFeedback()
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // clipboard error fallback
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void startHost()
    } else {
      resetSessions()
    }
  },
)

onUnmounted(() => {
  resetSessions()
})
</script>

<template>
  <div v-if="open" class="sync-overlay" @click.self="emit('close')">
    <div class="sync-modal surface-glass">
      <div class="modal-header">
        <div class="header-info">
          <div class="icon-bubble">
            <Radio :size="20" class="text-cyan-400" />
          </div>
          <div>
            <h3>{{ t('settings.p2pTitle', 'P2P Device Sync (WebRTC)') }}</h3>
            <p>{{ t('settings.p2pSubtitle', 'Synchronize data directly between devices on local network') }}</p>
          </div>
        </div>
        <button type="button" class="close-btn" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: mode === 'host' }"
          @click="startHost"
        >
          <Laptop :size="16" />
          <span>{{ t('settings.p2pHostTab', 'Host / Share') }}</span>
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ active: mode === 'client' }"
          @click="resetSessions(); mode = 'client'"
        >
          <Smartphone :size="16" />
          <span>{{ t('settings.p2pJoinTab', 'Join / Receive') }}</span>
        </button>
      </div>

      <!-- Status banner -->
      <div v-if="status === 'complete'" class="status-banner complete">
        <CheckCircle2 :size="18" />
        <span>{{ t('settings.p2pComplete', 'Sync Complete! Local database up-to-date.') }}</span>
      </div>
      <div v-else-if="status === 'error'" class="status-banner error">
        <span>{{ statusDetails || t('settings.p2pError', 'Connection failed') }}</span>
      </div>
      <div v-else-if="status === 'syncing'" class="status-banner syncing">
        <div class="spinner" />
        <span>{{ statusDetails || t('settings.p2pSyncing', 'Transferring database...') }}</span>
      </div>

      <!-- HOST VIEW -->
      <div v-if="mode === 'host'" class="panel-content">
        <div v-if="status !== 'complete'">
          <div class="step-card">
            <span class="step-badge">1</span>
            <div class="step-text">
              <strong>{{ t('settings.p2pHostStep1', 'Scan QR or copy Pairing Code on second device') }}</strong>
            </div>
          </div>

          <div v-if="hostOfferQrSvg" class="qr-container">
            <div class="qr-box" v-html="hostOfferQrSvg" />
            <button type="button" class="copy-pill" @click="copyText(hostOfferCode)">
              <Copy :size="14" />
              <span>{{ copied ? t('settings.p2pCopied', 'Copied!') : t('settings.p2pCopyOffer', 'Copy Pairing Code') }}</span>
            </button>
          </div>

          <div class="step-card" style="margin-top: 1rem;">
            <span class="step-badge">2</span>
            <div class="step-text">
              <strong>{{ t('settings.p2pHostStep2', 'Paste Answer Code from the second device') }}</strong>
            </div>
          </div>

          <div class="input-action-row">
            <input
              v-model="clientAnswerInput"
              type="text"
              class="code-input"
              :placeholder="t('settings.p2pPasteAnswerPlaceholder', 'Paste Answer code here...')"
            />
            <AppButton size="sm" :disabled="!clientAnswerInput.trim()" @click="submitAnswerToHost">
              {{ t('settings.p2pConnect', 'Connect') }}
            </AppButton>
          </div>
        </div>

        <div v-else class="success-actions">
          <AppButton block variant="filled" @click="emit('close')">
            {{ t('common.done', 'Done') }}
          </AppButton>
        </div>
      </div>

      <!-- JOIN / CLIENT VIEW -->
      <div v-else class="panel-content">
        <div v-if="status !== 'complete'">
          <div class="step-card">
            <span class="step-badge">1</span>
            <div class="step-text">
              <strong>{{ t('settings.p2pClientStep1', 'Paste Pairing Code from the Host device') }}</strong>
            </div>
          </div>

          <div class="input-action-row">
            <input
              v-model="hostOfferInput"
              type="text"
              class="code-input"
              :placeholder="t('settings.p2pPasteOfferPlaceholder', 'Paste Host code here...')"
            />
            <AppButton size="sm" :disabled="!hostOfferInput.trim()" @click="submitOfferToClient">
              {{ t('settings.p2pGenerateAnswer', 'Accept') }}
            </AppButton>
          </div>

          <div v-if="clientAnswerCode" style="margin-top: 1rem;">
            <div class="step-card">
              <span class="step-badge">2</span>
              <div class="step-text">
                <strong>{{ t('settings.p2pClientStep2', 'Show this QR or paste Answer back on Host') }}</strong>
              </div>
            </div>

            <div v-if="clientAnswerQrSvg" class="qr-container">
              <div class="qr-box" v-html="clientAnswerQrSvg" />
              <button type="button" class="copy-pill" @click="copyText(clientAnswerCode)">
                <Copy :size="14" />
                <span>{{ copied ? t('settings.p2pCopied', 'Copied!') : t('settings.p2pCopyAnswer', 'Copy Answer Code') }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="success-actions">
          <AppButton block variant="filled" @click="emit('close')">
            {{ t('common.done', 'Done') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.sync-modal {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: var(--radius-xl, 1.25rem);
  padding: 1.25rem;
  background: var(--color-surface, #1e1e24);
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.15));
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-bubble {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-on-surface);
}

.header-info p {
  font-size: 0.75rem;
  color: var(--color-muted);
  margin: 0.15rem 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
}

.mode-tabs {
  display: flex;
  background: var(--color-surface-container, rgba(255, 255, 255, 0.05));
  padding: 3px;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.1));
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px;
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab.active {
  background: var(--color-primary, #06b6d4);
  color: #fff;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.35);
}

.step-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.step-text strong {
  font-size: 0.82rem;
  color: var(--color-on-surface);
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: var(--radius-lg);
  margin-bottom: 0.75rem;
}

.qr-box {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-box :deep(svg) {
  width: 100%;
  height: 100%;
}

.copy-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #111827;
  color: #f3f4f6;
  border: none;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.input-action-row {
  display: flex;
  gap: 0.5rem;
}

.code-input {
  flex: 1;
  background: var(--color-surface-container, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-md);
  padding: 7px 10px;
  color: var(--color-on-surface);
  font-size: 0.8rem;
}

.code-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-banner.complete {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-banner.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-banner.syncing {
  background: rgba(6, 182, 212, 0.2);
  color: #06b6d4;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(6, 182, 212, 0.3);
  border-top-color: #06b6d4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
