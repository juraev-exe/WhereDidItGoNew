<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  ChevronRight,
  Cookie,
  ExternalLink,
  FileText,
  Mail,
  Receipt,
  Scale,
  ShieldCheck,
  Trash2,
} from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { tickFeedback } from '@/services/native/haptics'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-backups'): void
}>()

const { t } = useI18n()

const licensesOpen = ref(false)

const BASE_URL = 'https://juraev-exe.github.io/wherediditgo'

function openUrl(path: string) {
  void tickFeedback()
  window.open(`${BASE_URL}/${path}`, '_blank', 'noopener,noreferrer')
}

function onOpenLicenses() {
  void tickFeedback()
  licensesOpen.value = true
}

function onOpenReset() {
  void tickFeedback()
  emit('open-backups')
}
</script>

<template>
  <div class="subpage">
    <div class="subpage-header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.legalTitle', 'Legal & Compliance') }}</h2>
    </div>

    <!-- Quick Compliance Badge -->
    <div class="compliance-card surface-glass">
      <div class="compliance-badge">
        <ShieldCheck :size="24" class="text-primary" />
      </div>
      <div class="compliance-copy">
        <span class="compliance-title">100% Local-First & Zero Tracking</span>
        <span class="compliance-sub">
          All financial data is stored on this physical device. We operate no cloud databases, collect no telemetry on your money, and show zero ads.
        </span>
      </div>
    </div>

    <!-- Group 1: Core Policies -->
    <div class="grouped-section">
      <!-- Privacy Policy -->
      <button type="button" class="row-btn" @click="openUrl('privacy.html')">
        <div class="row-left">
          <div class="icon-circle icon-teal">
            <ShieldCheck :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.privacyPolicy', 'Privacy Policy') }}</span>
            <span class="subtitle">{{ t('settings.privacyPolicyDesc', '100% local-first data, zero server transmission') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ExternalLink :size="16" class="icon-muted" />
        </div>
      </button>

      <div class="divider" />

      <!-- Terms of Service -->
      <button type="button" class="row-btn" @click="openUrl('terms.html')">
        <div class="row-left">
          <div class="icon-circle icon-blue">
            <FileText :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.termsOfService', 'Terms of Service') }}</span>
            <span class="subtitle">{{ t('settings.termsOfServiceDesc', 'Personal finance disclaimer & usage terms') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ExternalLink :size="16" class="icon-muted" />
        </div>
      </button>

      <div class="divider" />

      <!-- Refund Policy -->
      <button type="button" class="row-btn" @click="openUrl('refund.html')">
        <div class="row-left">
          <div class="icon-circle icon-amber">
            <Receipt :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.refundPolicy', 'Refund Policy') }}</span>
            <span class="subtitle">{{ t('settings.refundPolicyDesc', 'Google Play & Apple refund rules, transparent pricing') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ExternalLink :size="16" class="icon-muted" />
        </div>
      </button>

      <div class="divider" />

      <!-- Cookie & Storage Policy -->
      <button type="button" class="row-btn" @click="openUrl('cookies.html')">
        <div class="row-left">
          <div class="icon-circle icon-purple">
            <Cookie :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.cookiePolicy', 'Cookie & Storage Policy') }}</span>
            <span class="subtitle">{{ t('settings.cookiePolicyDesc', 'No advertising cookies, essential local storage only') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ExternalLink :size="16" class="icon-muted" />
        </div>
      </button>
    </div>

    <!-- Group 2: User Rights & Data Deletion -->
    <h3 class="section-title">{{ t('settings.dataDeletion', 'Data Deletion & Rights') }}</h3>

    <div class="grouped-section">
      <!-- Data Reset in Danger Zone -->
      <button type="button" class="row-btn" @click="onOpenReset">
        <div class="row-left">
          <div class="icon-circle icon-red">
            <Trash2 :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.reset', 'Reset all local data') }}</span>
            <span class="subtitle">{{ t('settings.resetDesc', 'Deletes every account, transaction, budget, and setting on this device.') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ChevronRight :size="18" class="chevron-right" />
        </div>
      </button>

      <div class="divider" />

      <!-- Full Data Deletion Guide -->
      <button type="button" class="row-btn" @click="openUrl('data-deletion.html')">
        <div class="row-left">
          <div class="icon-circle icon-gray">
            <Scale :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.dataDeletion', 'Data Deletion & Rights') }}</span>
            <span class="subtitle">{{ t('settings.dataDeletionDesc', 'Instant local reset and correspondence erasure') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ExternalLink :size="16" class="icon-muted" />
        </div>
      </button>
    </div>

    <!-- Group 3: Attributions & Licensing -->
    <h3 class="section-title">{{ t('settings.licensesAttributions', 'Licenses & Attributions') }}</h3>

    <div class="grouped-section">
      <button type="button" class="row-btn" @click="onOpenLicenses">
        <div class="row-left">
          <div class="icon-circle icon-teal">
            <FileText :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.licensesAttributions', 'Licenses & Attributions') }}</span>
            <span class="subtitle">{{ t('settings.licensesAttributionsDesc', 'Open source fonts, icons, and artwork credits') }}</span>
          </div>
        </div>
        <div class="row-right">
          <ChevronRight :size="18" class="chevron-right" />
        </div>
      </button>
    </div>

    <!-- Group 4: Business Details & Contact -->
    <h3 class="section-title">{{ t('settings.supportContact', 'Support & Inquiries') }}</h3>

    <div class="grouped-section">
      <div class="row-info">
        <div class="row-left">
          <div class="icon-circle icon-blue">
            <Mail :size="19" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.supportContact', 'Support & Inquiries') }}</span>
            <span class="subtitle">support@wherediditgo.app</span>
          </div>
        </div>
        <a href="mailto:support@wherediditgo.app" class="contact-pill">Email</a>
      </div>
    </div>

    <!-- Licenses Bottom Sheet -->
    <BottomSheet :open="licensesOpen" :title="t('settings.licensesAttributions')" @close="licensesOpen = false">
      <div class="sheet-content">
        <div class="license-block">
          <strong>Application Codebase</strong>
          <p>Licensed under the ISC License. © 2026 Juraev.exe.</p>
        </div>
        <div class="license-block">
          <strong>Open Fonts</strong>
          <p>Outfit, Fraunces, Signika, DM Sans — Licensed under the SIL Open Font License 1.1 (OFL).</p>
        </div>
        <div class="license-block">
          <strong>Iconography</strong>
          <p>Lucide Icons — Licensed under the ISC License. © Lucide Contributors.</p>
        </div>
        <div class="license-block">
          <strong>Ghost Illustration</strong>
          <p>Created by @xubohuah / Saad Shaikh — Licensed under the MIT License.</p>
        </div>
      </div>
    </BottomSheet>
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

.subpage-header h2 {
  font-size: var(--font-title-large);
  font-weight: 700;
  margin: 0;
  color: var(--color-on-surface);
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

.compliance-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-outline-variant);
}

.compliance-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  flex-shrink: 0;
}

.compliance-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compliance-title {
  font-size: var(--font-body-large);
  font-weight: 600;
  color: var(--color-on-surface);
}

.compliance-sub {
  font-size: var(--font-body-small);
  line-height: 1.45;
  color: var(--color-on-surface-variant);
}

.section-title {
  font-size: var(--font-label-large);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
  margin: var(--space-2) 0 0 var(--space-2);
}

.grouped-section {
  background: var(--color-surface-container-low);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-outline-variant);
}

.row-btn,
.row-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}

.row-btn:active {
  background: var(--color-surface-container-high);
}

.row-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.row-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: var(--space-2);
}

.row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-label .title {
  font-size: var(--font-body-large);
  font-weight: 500;
  color: var(--color-on-surface);
}

.row-label .subtitle {
  font-size: var(--font-body-small);
  color: var(--color-on-surface-variant);
  line-height: 1.35;
}

.divider {
  height: 1px;
  background: var(--color-outline-variant);
  margin-left: 56px;
}

.icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.icon-teal {
  background: color-mix(in srgb, #0b6e6a 15%, transparent);
  color: #0b6e6a;
}

.icon-blue {
  background: color-mix(in srgb, #2563eb 15%, transparent);
  color: #2563eb;
}

.icon-amber {
  background: color-mix(in srgb, #d97706 15%, transparent);
  color: #d97706;
}

.icon-purple {
  background: color-mix(in srgb, #7c3aed 15%, transparent);
  color: #7c3aed;
}

.icon-red {
  background: color-mix(in srgb, #dc2626 15%, transparent);
  color: #dc2626;
}

.icon-gray {
  background: color-mix(in srgb, #6b7280 15%, transparent);
  color: #6b7280;
}

.icon-muted {
  color: var(--color-outline);
}

.chevron-right {
  color: var(--color-outline);
}

.contact-pill {
  font-size: 0.825rem;
  font-weight: 600;
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 6px 14px;
  border-radius: 9999px;
  text-decoration: none;
}

.sheet-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-3) 0 var(--space-6);
}

.license-block {
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: var(--font-body-small);
  line-height: 1.5;
  color: var(--color-on-surface);
}

.license-block strong {
  display: block;
  font-size: var(--font-body-medium);
  margin-bottom: 4px;
  color: var(--color-on-surface);
}

.license-block p {
  margin: 0;
  color: var(--color-on-surface-variant);
}
</style>
