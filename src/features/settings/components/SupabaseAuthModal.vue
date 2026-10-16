<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail, Lock, AlertCircle } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useSupabaseStore } from '@/stores/supabase'
import { successFeedback, errorFeedback } from '@/services/native/haptics'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', message: string): void
}>()

const { t } = useI18n()
const supabaseStore = useSupabaseStore()

type AuthTab = 'signin' | 'signup' | 'magic'
const activeTab = ref<AuthTab>('signin')

const email = ref('')
const password = ref('')
const formError = ref('')
const isSubmitting = ref(false)

function resetForm() {
  email.value = ''
  password.value = ''
  formError.value = ''
  isSubmitting.value = false
}

async function handleSubmit() {
  formError.value = ''
  if (!email.value || !email.value.includes('@')) {
    formError.value = t('supabase.invalidEmail', 'Please enter a valid email address.')
    void errorFeedback()
    return
  }

  if (activeTab.value !== 'magic' && (!password.value || password.value.length < 6)) {
    formError.value = t('supabase.shortPassword', 'Password must be at least 6 characters.')
    void errorFeedback()
    return
  }

  isSubmitting.value = true
  try {
    if (activeTab.value === 'signin') {
      await supabaseStore.login(email.value, password.value)
      void successFeedback()
      emit('success', t('supabase.signedIn', 'Successfully signed in!'))
      emit('close')
      resetForm()
    } else if (activeTab.value === 'signup') {
      await supabaseStore.register(email.value, password.value)
      void successFeedback()
      emit('success', t('supabase.signedUp', 'Account created! Please check your email to confirm.'))
      emit('close')
      resetForm()
    } else {
      await supabaseStore.loginWithMagicLink(email.value)
      void successFeedback()
      emit('success', t('supabase.magicSent', 'Magic sign-in link sent to your email.'))
      emit('close')
      resetForm()
    }
  } catch (err: any) {
    formError.value = err.message || t('supabase.authError', 'Authentication failed.')
    void errorFeedback()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="t('supabase.cloudAccount', 'Supabase Cloud Account')"
    @close="emit('close')"
  >
    <div class="auth-modal-content">
      <!-- Tabs -->
      <div class="tabs-header">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'signin' }"
          @click="activeTab = 'signin'; formError = ''"
        >
          {{ t('supabase.tabSignIn', 'Sign In') }}
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'signup' }"
          @click="activeTab = 'signup'; formError = ''"
        >
          {{ t('supabase.tabSignUp', 'Register') }}
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'magic' }"
          @click="activeTab = 'magic'; formError = ''"
        >
          {{ t('supabase.tabMagic', 'Magic Link') }}
        </button>
      </div>

      <p class="auth-subtitle">
        {{
          activeTab === 'signin'
            ? t('supabase.subSignIn', 'Sign in to sync your finances across mobile, web and desktop.')
            : activeTab === 'signup'
              ? t('supabase.subSignUp', 'Create your private cloud vault with Row Level Security.')
              : t('supabase.subMagic', 'Receive a secure one-click sign-in link in your inbox.')
        }}
      </p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <!-- Email Field -->
        <label class="input-group">
          <span class="label-text">{{ t('supabase.emailLabel', 'Email') }}</span>
          <div class="input-wrapper">
            <Mail :size="18" class="input-icon" />
            <input
              v-model="email"
              type="email"
              class="text-input"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>
        </label>

        <!-- Password Field (if not Magic Link) -->
        <label v-if="activeTab !== 'magic'" class="input-group">
          <span class="label-text">{{ t('supabase.passwordLabel', 'Password') }}</span>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input
              v-model="password"
              type="password"
              class="text-input"
              placeholder="••••••••"
              autocomplete="current-password"
              minlength="6"
              required
            />
          </div>
        </label>

        <!-- Error Banner -->
        <div v-if="formError" class="error-banner">
          <AlertCircle :size="16" class="error-icon" />
          <span>{{ formError }}</span>
        </div>

        <!-- Submit Button -->
        <AppButton
          type="submit"
          block
          variant="filled"
          class="submit-btn"
          :disabled="isSubmitting"
        >
          <span v-if="!isSubmitting">
            {{
              activeTab === 'signin'
                ? t('supabase.btnSignIn', 'Sign In')
                : activeTab === 'signup'
                  ? t('supabase.btnSignUp', 'Create Account')
                  : t('supabase.btnSendMagic', 'Send Magic Link')
            }}
          </span>
          <span v-else>{{ t('supabase.processing', 'Processing…') }}</span>
        </AppButton>
      </form>
    </div>
  </BottomSheet>
</template>

<style scoped>
.auth-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 0.5rem;
}

.tabs-header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: color-mix(in srgb, var(--cat, #0d9488) 8%, var(--bg-surface, #ffffff));
  padding: 0.25rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--cat, #0d9488) 15%, transparent);
}

.tab-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted, #71717a);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn.active {
  background: var(--bg-card, #ffffff);
  color: var(--text-normal, #18181b);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.auth-subtitle {
  font-size: 0.8125rem;
  color: var(--text-muted, #71717a);
  line-height: 1.45;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #71717a);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--text-muted, #a1a1aa);
  pointer-events: none;
}

.text-input {
  width: 100%;
  padding: 0.75rem 0.875rem 0.75rem 2.625rem;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e4e4e7);
  background: var(--bg-input, rgba(255, 255, 255, 0.8));
  color: var(--text-normal, #18181b);
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
}

.text-input:focus {
  border-color: var(--cat, #0d9488);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cat, #0d9488) 20%, transparent);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: color-mix(in srgb, #ef4444 12%, transparent);
  border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
  border-radius: 10px;
  color: #ef4444;
  font-size: 0.8125rem;
}

.error-icon {
  flex-shrink: 0;
}

.submit-btn {
  margin-top: 0.5rem;
  height: 48px;
  font-size: 0.9375rem;
  font-weight: 600;
}
</style>
