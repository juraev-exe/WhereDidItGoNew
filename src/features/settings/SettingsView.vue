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
  Sliders,
  Wallet,
} from '@lucide/vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import BackupsSettings from './components/BackupsSettings.vue'
import FormattingSettings from './components/FormattingSettings.vue'
import NavigationSettings from './components/NavigationSettings.vue'
import SecurityPrivacySettings from './components/SecurityPrivacySettings.vue'
import Snackbar from '@/components/ui/Snackbar.vue'
import { tickFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useUiStore } from '@/stores/ui'
import { usePremiumStore } from '@/stores/premium'
import pkg from '../../../package.json'

type Subpage = 'root' | 'formatting' | 'appearance' | 'navigation' | 'securityPrivacy' | 'backups'

const APP_VERSION = pkg.version
const REPO_URL = 'https://github.com/juraev-exe/wherediditgo'

const { t } = useI18n()
const router = useRouter()
const accounts = useAccountsStore()
const premium = usePremiumStore()
const ui = useUiStore()

const activeSubpage = ref<Subpage>('root')
const message = ref('')

function onNotify(msg: string) {
  message.value = msg
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

      <!-- Group 4: Attribution & About -->
      <div class="group-card about-card surface-glass">
        <div class="about-content">
          <span class="app-name">WhereDidItGo</span>
          <span class="app-version">{{ t('settings.version', { version: APP_VERSION }) }}</span>
          <span class="author-tag">{{ t('settings.craftedBy', 'Crafted by Juraev.exe') }}</span>
          <a :href="REPO_URL" target="_blank" rel="noopener noreferrer" class="github-link">
            <ExternalLink :size="14" />
            {{ t('settings.viewOnGithub', 'View on GitHub') }}
          </a>
        </div>
      </div>
    </div>

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
  background: linear-gradient(135deg, color-mix(in srgb, #007aff 16%, var(--color-surface)), color-mix(in srgb, #5856d6 18%, var(--color-surface)));
  border: 1px solid color-mix(in srgb, #007aff 30%, transparent);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.12);
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
  background: linear-gradient(135deg, #007aff, #5856d6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.35);
}

.pro-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.pro-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.pro-sub {
  font-size: 0.8rem;
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
  background: color-mix(in srgb, #007aff 15%, transparent);
  color: #007aff;
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
  background: color-mix(in srgb, #ff9500 15%, transparent);
  color: #ff9500;
}

.icon-indigo {
  background: color-mix(in srgb, #5856d6 15%, transparent);
  color: #5856d6;
}

.icon-emerald {
  background: color-mix(in srgb, #34c759 15%, transparent);
  color: #34c759;
}

.icon-sky {
  background: color-mix(in srgb, #0284c7 15%, transparent);
  color: #0284c7;
}

.icon-rose {
  background: color-mix(in srgb, #ff2d55 15%, transparent);
  color: #ff2d55;
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.row-sub {
  font-size: 0.82rem;
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
  gap: 4px;
}

.app-name {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.app-version {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.author-tag {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: var(--space-1);
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--color-muted);
  margin-top: var(--space-2);
  transition: color var(--duration-fast);
}

.github-link:hover {
  color: var(--color-on-surface);
}
</style>
