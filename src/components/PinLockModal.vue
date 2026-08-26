<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lock, Fingerprint, Delete, ShieldAlert } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settings'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'

const props = defineProps<{
  mode?: 'unlock' | 'setup'
}>()

const emit = defineEmits<{
  (e: 'success', pin?: string): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const pin = ref('')
const confirmPin = ref('')
const isConfirming = ref(false)
const errorMessage = ref('')
const isShaking = ref(false)

watch(pin, (newVal) => {
  if (newVal.length === 4) {
    handleComplete()
  }
})

async function handleComplete() {
  if (props.mode === 'setup') {
    if (!isConfirming.value) {
      confirmPin.value = pin.value
      pin.value = ''
      isConfirming.value = true
      errorMessage.value = ''
    } else {
      if (pin.value === confirmPin.value) {
        emit('success', pin.value)
      } else {
        triggerError(t('security.pinMismatch'))
        pin.value = ''
        confirmPin.value = ''
        isConfirming.value = false
      }
    }
  } else {
    const valid = await settings.verifyPin(pin.value)
    if (valid) {
      emit('success')
    } else {
      triggerError(t('security.incorrectPin'))
      pin.value = ''
    }
  }
}

function triggerError(msg: string) {
  errorMessage.value = msg
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, 500)
}

function pressKey(num: string) {
  if (pin.value.length < 4) {
    pin.value += num
  }
}

function backspace() {
  pin.value = pin.value.slice(0, -1)
}

function clear() {
  pin.value = ''
}

async function handleBiometrics() {
  if (props.mode !== 'setup' && settings.biometricEnabled) {
    // Biometric unlock simulated or native API
    settings.unlockApp()
    emit('success')
  }
}

const confirmResetOpen = ref(false)

async function handleResetLock() {
  confirmResetOpen.value = false
  await settings.removePin()
  emit('cancel')
}
</script>

<template>
  <div class="pin-modal-overlay">
    <div class="pin-card" :class="{ shake: isShaking }">
      <div class="pin-header">
        <div class="pin-icon">
          <Lock class="w-8 h-8 text-amber-500" />
        </div>
        <h2 class="pin-title">
          <template v-if="mode === 'setup'">
            {{ isConfirming ? t('security.confirmPin') : t('security.createPin') }}
          </template>
          <template v-else>
            {{ t('security.enterPin') }}
          </template>
        </h2>
        <p v-if="errorMessage" class="pin-error">{{ errorMessage }}</p>
      </div>

      <!-- PIN Dots -->
      <div class="pin-dots">
        <span
          v-for="i in 4"
          :key="i"
          class="pin-dot"
          :class="{ active: pin.length >= i }"
        ></span>
      </div>

      <!-- Keypad -->
      <div class="keypad-grid">
        <button
          v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="num"
          type="button"
          class="key-btn"
          @click="pressKey(num)"
        >
          {{ num }}
        </button>

        <button
          v-if="mode !== 'setup' && settings.biometricEnabled"
          type="button"
          class="key-btn action-key"
          @click="handleBiometrics"
        >
          <Fingerprint class="w-6 h-6 text-primary" />
        </button>
        <button v-else type="button" class="key-btn action-key" @click="clear">
          C
        </button>

        <button type="button" class="key-btn" @click="pressKey('0')">0</button>

        <button type="button" class="key-btn action-key" @click="backspace">
          <Delete class="w-6 h-6" />
        </button>
      </div>

      <div v-if="mode !== 'setup'" class="pin-footer">
        <button type="button" class="reset-link" @click="confirmResetOpen = true">
          <ShieldAlert class="w-4 h-4 mr-1" />
          {{ t('security.forgotPin') }}
        </button>
      </div>
      <div v-else-if="mode === 'setup'" class="pin-footer">
        <button type="button" class="cancel-btn" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>

  <ConfirmSheet
    :open="confirmResetOpen"
    :title="t('security.resetSecurity')"
    :message="t('security.resetSecurityConfirm')"
    :confirm-label="t('security.resetSecurity')"
    destructive
    @confirm="handleResetLock"
    @close="confirmResetOpen = false"
  />
</template>

<style scoped>
.pin-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  transition: background-color var(--duration-normal) var(--ease-standard);
}

.pin-card {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pin-header {
  text-align: center;
  margin-bottom: 2rem;
}

.pin-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.pin-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.pin-error {
  color: var(--color-error, #ef4444);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-weight: 600;
}

.pin-dots {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-outline);
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background-color var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}

.pin-dot.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 50%, transparent);
  transform: scale(1.15);
  animation: popIn 0.25s var(--ease-spring) both;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem 1rem;
  width: 100%;
  place-items: center;
}

.key-btn {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: none;
  background-color: var(--color-surface-container-high);
  color: var(--color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background-color var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-spring-snappy),
              box-shadow var(--duration-fast) var(--ease-standard);
  touch-action: manipulation;
}

@media (hover: hover) and (pointer: fine) {
  .key-btn:hover {
    transform: scale(1.06);
    background-color: var(--color-surface-container-highest);
    box-shadow: var(--shadow-md);
  }
}

.key-btn:active {
  transform: scale(0.9) translateY(0);
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

.action-key {
  background-color: transparent;
  box-shadow: none;
  color: var(--color-muted);
  font-size: 1.125rem;
}

.action-key:hover {
  background-color: var(--color-surface-container);
  transform: scale(1.06);
}

.action-key:active {
  background-color: var(--color-surface-container-highest);
  transform: scale(0.92);
}

.pin-footer {
  margin-top: 2rem;
}

.reset-link {
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.cancel-btn {
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  color: var(--color-on-surface);
  padding: 0.6rem 2rem;
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}

.cancel-btn:active {
  background: var(--color-surface-container-high);
}

.shake {
  animation: shakeKeypad 0.4s ease-in-out;
}

@keyframes shakeKeypad {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-10px); }
  40%, 80% { transform: translateX(10px); }
}
</style>
