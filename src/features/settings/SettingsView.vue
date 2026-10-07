<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  FolderKanban,
  LayoutGrid,
  Lock,
  Palette,
  RefreshCw,
  Scale,
  Sliders,
  Wallet,
  Trash2,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import BackupsSettings from './components/BackupsSettings.vue'
import FormattingSettings from './components/FormattingSettings.vue'
import LegalSettings from './components/LegalSettings.vue'
import NavigationSettings from './components/NavigationSettings.vue'
import SecurityPrivacySettings from './components/SecurityPrivacySettings.vue'
import Snackbar from '@/components/ui/Snackbar.vue'
import { tickFeedback, warningFeedback } from '@/services/native/haptics'
import { resetLocalData } from '@/db'
import { useAccountsStore } from '@/stores/accounts'
import { useUiStore } from '@/stores/ui'
import { usePremiumStore } from '@/stores/premium'
import pkg from '../../../package.json'

type Subpage = 'root' | 'formatting' | 'appearance' | 'navigation' | 'securityPrivacy' | 'backups' | 'legal'

const APP_VERSION = pkg.version
const REPO_URL = 'https://github.com/juraev-exe/wherediditgo'

const { t } = useI18n()
const router = useRouter()
const accounts = useAccountsStore()
const premium = usePremiumStore()
const ui = useUiStore()

const activeSubpage = ref<Subpage>('root')
const message = ref('')

const resetSheetOpen = ref(false)
const resetA = ref(2)
const resetB = ref(3)
const resetAnswer = ref('')
const resetError = ref('')
const resetting = ref(false)

function onNotify(msg: string) {
  message.value = msg
}

function openReset() {
  void warningFeedback()
  resetA.value = Math.floor(Math.random() * 8) + 2
  resetB.value = Math.floor(Math.random() * 8) + 2
  resetAnswer.value = ''
  resetError.value = ''
  resetSheetOpen.value = true
}

async function executeReset() {
  const expected = resetA.value + resetB.value
  if (parseInt(resetAnswer.value, 10) !== expected) {
    resetError.value = t('settings.resetWrong', 'Incorrect answer. Try again.')
    return
  }
  resetting.value = true
  try {
    await resetLocalData()
    window.location.reload()
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : 'Reset failed'
  } finally {
    resetting.value = false
  }
}

function openSubpage(page: Subpage) {
  activeSubpage.value = page
  void tickFeedback()
}

function goBack() {
  if (window.history.length > 1) router.back()
  else void router.replace('/')
}

/**
 * Sub-pages are local state rather than routes, so publish the current one to the
 * UI store: the platform back gesture (App.vue) closes it before leaving Settings.
 */
watch(activeSubpage, (page) => ui.setSettingsSubpage(page), { immediate: true })
watch(
  () => ui.settingsSubpage,
  (page) => {
    if (page === 'root') activeSubpage.value = 'root'
  },
)
onUnmounted(() => ui.setSettingsSubpage('root'))
</script>

<template>
  <div class="settings-view">
    <!-- Subpages -->
    <FormattingSettings
      v-if="activeSubpage === 'formatting'"
      @back="activeSubpage = 'root'"
      @notify="onNotify"
    />

    <AppearanceSettings
      v-else-if="activeSubpage === 'appearance'"
      @back="activeSubpage = 'root'"
      @notify="onNotify"
    />

    <NavigationSettings
      v-else-if="activeSubpage === 'navigation'"
      @back="activeSubpage = 'root'"
      @notify="onNotify"
    />

    <SecurityPrivacySettings
      v-else-if="activeSubpage === 'securityPrivacy'"
      @back="activeSubpage = 'root'"
      @notify="onNotify"
    />

    <BackupsSettings
      v-else-if="activeSubpage === 'backups'"
      @back="activeSubpage = 'root'"
      @notify="onNotify"
    />

    <LegalSettings
      v-else-if="activeSubpage === 'legal'"
      @back="activeSubpage = 'root'"
      @open-backups="activeSubpage = 'backups'"
    />

    <!-- Main Apple Inset Grouped Settings Hub -->
    <div v-else class="hub-container">
      <header class="hub-header">
        <button type="button" class="hub-back" :aria-label="t('common.back')" @click="goBack">
          <ArrowLeft :size="22" />
        </button>
        <h1>{{ t('settings.title', 'Settings') }}</h1>
      </header>

      <!-- Pro Upgrade Banner if not Pro -->
      <button
        v-if="!premium.isPremiumUser"
        type="button"
        class="pro-banner"
        @click="premium.openPaywall(t('premium.upgradeBannerTitle', 'Get Lifetime Access to WhereDidItGo Pro'))"
      >
        <div class="pro-badge-icon">
          <Crown :size="22" />
        </div>
        <div class="pro-banner-text">
          <span class="pro-title">{{ t('premium.unlockTitle', 'WhereDidItGo Pro') }}</span>
          <span class="pro-sub">{{ t('premium.unlockSub', 'Unlimited accounts, cloud backups, exports & privacy shield') }}</span>
        </div>
        <ChevronRight :size="18" class="chevron-right" />
      </button>

      <!-- Group 1: Preferences & Appearance -->
      <div class="group-card surface-glass">
        <!-- Formatting -->
        <button type="button" class="group-row" @click="openSubpage('formatting')">
          <div class="row-left">
            <div class="icon-squircle icon-blue">
              <Sliders :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.formattingTitle', 'Formatting') }}</span>
              <span class="row-sub">{{ t('settings.formattingSub', 'Main currency, format, hide cents') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>

        <div class="divider" />

        <!-- Styles & Appearance -->
        <button type="button" class="group-row" @click="openSubpage('appearance')">
          <div class="row-left">
            <div class="icon-squircle icon-purple">
              <Palette :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.stylesTitle', 'Styles and elements') }}</span>
              <span class="row-sub">{{ t('settings.stylesSub', 'Colour palettes, dark/oled modes, language') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>

        <div class="divider" />

        <!-- Navigation Tabs -->
        <button type="button" class="group-row" @click="openSubpage('navigation')">
          <div class="row-left">
            <div class="icon-squircle icon-teal">
              <LayoutGrid :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.navigationTabs', 'Bottom navigation') }}</span>
              <span class="row-sub">{{ t('settings.navigationSub', 'Customize visible tab bar elements') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>
      </div>

      <!-- Group 2: Security & Privacy -->
      <div class="group-card surface-glass">
        <button type="button" class="group-row" @click="openSubpage('securityPrivacy')">
          <div class="row-left">
            <div class="icon-squircle icon-amber">
              <Lock :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.securityPrivacyTitle', 'Security & Privacy') }}</span>
              <span class="row-sub">{{ t('settings.securityPrivacySub', 'PIN lock, biometrics, and hidden values') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>
      </div>

      <!-- Group 3: Data & Organization -->
      <div class="group-card surface-glass">
        <!-- Backups -->
        <button type="button" class="group-row" @click="openSubpage('backups')">
          <div class="row-left">
            <div class="icon-squircle icon-emerald">
              <RefreshCw :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.backupsTitle', 'Backups & Storage') }}</span>
              <span class="row-sub">{{ t('settings.backupsSub', 'Saving data to local backups and CSV') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>

        <div class="divider" />

        <!-- Accounts -->
        <button type="button" class="group-row" @click="router.push('/accounts')">
          <div class="row-left">
            <div class="icon-squircle icon-sky">
              <Wallet :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.accounts', 'Accounts') }}</span>
              <span class="row-sub">{{ t('settings.activeAccounts', { count: accounts.accounts.filter((a) => !a.archived).length }) }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>

        <div class="divider" />

        <!-- Categories -->
        <button type="button" class="group-row" @click="router.push('/categories')">
          <div class="row-left">
            <div class="icon-squircle icon-rose">
              <FolderKanban :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.categories', 'Categories') }}</span>
              <span class="row-sub">{{ t('settings.categoriesSub', 'Expense & income categories') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>
      </div>

      <!-- Group 4: Legal & Compliance -->
      <div class="group-card surface-glass">
        <button type="button" class="group-row" @click="openSubpage('legal')">
          <div class="row-left">
            <div class="icon-squircle icon-teal">
              <Scale :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title">{{ t('settings.legalTitle', 'Legal & Compliance') }}</span>
              <span class="row-sub">{{ t('settings.legalSub', 'Privacy policy, terms, refunds & data rights') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>
      </div>

      <!-- Group 5: Attribution & About -->
      <div class="group-card about-card surface-glass">
        <div class="about-content">
          <span class="app-name">WhereDidItGo</span>
          <span class="app-version">{{ t('settings.version', { version: APP_VERSION }) }}</span>
          <span class="author-tag">{{ t('settings.craftedBy', 'Crafted by Juraev.exe') }}</span>
          <a href="mailto:support@wherediditgo.app" class="github-link">
            support@wherediditgo.app
          </a>
          <a :href="REPO_URL" target="_blank" rel="noopener noreferrer" class="github-link">
            <ExternalLink :size="14" />
            {{ t('settings.viewOnGithub', 'View on GitHub') }}
          </a>
        </div>
      </div>

      <!-- Group 6: Danger Zone -->
      <div class="group-card surface-glass">
        <button type="button" class="group-row" @click="openReset">
          <div class="row-left">
            <div class="icon-squircle icon-red">
              <Trash2 :size="19" />
            </div>
            <div class="row-text">
              <span class="row-title danger-text">{{ t('settings.deleteAccount', 'Delete this account') }}</span>
              <span class="row-sub">{{ t('settings.deleteAccountSub', 'Permanently erase all your local data') }}</span>
            </div>
          </div>
          <ChevronRight :size="18" class="chevron-right" />
        </button>
      </div>
    </div>

    <!-- Reset Sheet -->
    <BottomSheet :open="resetSheetOpen" :title="t('settings.resetTitle', 'Delete Account & Data')" @close="resetSheetOpen = false">
      <div class="sheet-body">
        <p class="sheet-desc danger-desc">{{ t('settings.resetDesc', 'Deletes all transactions, accounts and budgets permanently') }}</p>
        <div class="challenge-box">
          <label for="reset-challenge">{{ t('settings.resetChallenge', { a: resetA, b: resetB }) }}</label>
          <input
            id="reset-challenge"
            v-model="resetAnswer"
            type="number"
            class="challenge-input"
            placeholder="?"
            @keydown.enter="executeReset"
          />
        </div>
        <p v-if="resetError" class="error-msg">{{ resetError }}</p>
        <AppButton
          block
          variant="filled"
          class="danger-action-btn"
          :disabled="resetting || !resetAnswer"
          @click="executeReset"
        >
          {{ resetting ? t('settings.resetting', 'Deleting…') : t('settings.resetConfirm', 'Delete Everything') }}
        </AppButton>
      </div>
    </BottomSheet>

    <Snackbar :open="!!message" :message="message" @update:open="(val: boolean) => { if (!val) message = '' }" />
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-8);
}

.hub-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.hub-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.hub-back {
  width: 40px;
  height: 40px;
  margin-left: calc(var(--space-2) * -1);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  transition: background var(--duration-fast) var(--ease-standard);
}

.hub-back:hover {
  background: var(--color-surface-container);
}

.hub-header h1 {
  font-size: var(--text-headline);
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-on-surface);
  letter-spacing: -0.022em;
  margin-bottom: var(--space-1);
}

/* Pro Banner */
.pro-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 16%, var(--color-surface)), color-mix(in srgb, var(--color-tertiary) 18%, var(--color-surface)));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 12%, transparent);
  cursor: pointer;
  text-align: left;
  transition: transform var(--duration-fast) var(--ease-spring);
}

.pro-banner:active {
  transform: scale(0.98);
}

.pro-badge-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-tertiary));
  color: var(--color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.pro-banner-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.pro-title {
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--color-on-surface);
}

.pro-sub {
  font-size: var(--text-caption);
  color: var(--color-muted);
  line-height: 1.35;
}

/* Apple Inset Grouped Cards */
.group-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.group-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-4) var(--space-4);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.group-row:active {
  background: color-mix(in srgb, var(--color-outline) 8%, transparent);
}

.row-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 86%;
}

.icon-squircle {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-blue {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.icon-purple {
  background: color-mix(in srgb, #af52de 15%, transparent);
  color: #af52de;
}

.icon-teal {
  background: color-mix(in srgb, #30b0c7 15%, transparent);
  color: #30b0c7;
}

.icon-amber {
  background: color-mix(in srgb, var(--color-warning) 15%, transparent);
  color: var(--color-warning);
}

.icon-indigo {
  background: color-mix(in srgb, var(--color-tertiary) 15%, transparent);
  color: var(--color-tertiary);
}

.icon-emerald {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
}

.icon-sky {
  background: color-mix(in srgb, #0284c7 15%, transparent);
  color: #0284c7;
}

.icon-rose {
  background: color-mix(in srgb, var(--color-expense) 15%, transparent);
  color: var(--color-expense);
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
}

.row-sub {
  font-size: var(--text-caption);
  color: var(--color-muted);
  line-height: 1.35;
}

.chevron-right {
  color: var(--color-muted);
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: var(--color-outline-variant);
  margin-left: calc(var(--space-4) + 38px + var(--space-3));
}

/* About Card */
.about-card {
  padding: var(--space-5);
}

.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-1);
}

.app-name {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-on-surface);
}

.app-version {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.author-tag {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-primary);
  margin-top: var(--space-1);
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-top: var(--space-2);
  transition: color var(--duration-fast);
}

.github-link:hover {
  color: var(--color-on-surface);
}

.danger-text {
  color: var(--color-expense);
}

.sheet-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0 var(--space-4);
}

.sheet-desc {
  font-size: 0.95rem;
  color: var(--color-on-surface);
}

.danger-desc {
  color: var(--color-expense);
}

.challenge-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: 600;
}

.challenge-input {
  width: 80px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
}

.error-msg {
  color: var(--color-expense);
  font-size: var(--text-caption);
}

.danger-action-btn {
  background: var(--color-expense) !important;
  color: var(--color-on-error) !important;
}
</style>
