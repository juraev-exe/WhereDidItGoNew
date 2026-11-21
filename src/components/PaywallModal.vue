<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Crown, Info, PlayCircle, RefreshCw, Sparkles, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePremiumStore } from '@/stores/premium'
import { useSupabaseStore } from '@/stores/supabase'
import { tickFeedback } from '@/services/native/haptics'
import {
  PremiumManager,
  findPackageForPlan,
  getPackagePriceAmount,
  getPackagePriceString,
  isBillingConfigured,
  sanitizeBillingError,
  type SubscriptionPlanId,
} from '@/services/native/billing'
import { isRewardedAdsConfigured } from '@/services/native/ads'
import { isNative } from '@/lib/platform'

const { t, locale } = useI18n()
const premium = usePremiumStore()
const supabaseStore = useSupabaseStore()

const checkoutSuspended = ref(false)
const open = computed({
  get: () => premium.paywallOpen,
  set: (val) => {
    if (!val) premium.closePaywall()
  },
})
const sheetOpen = computed(() => open.value && !checkoutSuspended.value)

type PlanId = SubscriptionPlanId
const selectedPlan = ref<PlanId>('lifetime')

const lifetimePrice = ref('$26.97')
const annualPrice = ref('$9.29')
const monthlyPrice = ref('$1.09')
const annualAmount = ref<{ amount: number; currency: string } | null>(null)
const monthlyAmount = ref<{ amount: number; currency: string } | null>(null)

const billingAvailable = computed(() => isBillingConfigured())
const showRewardedOption = computed(() => isRewardedAdsConfigured())

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(locale.value || undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

const annualWeeklyText = computed(() => {
  if (!annualAmount.value || annualAmount.value.amount <= 0) {
    return t('premium.billedAnnually', 'Billed annually')
  }
  const perWeek = formatCurrencyAmount(annualAmount.value.amount / 52, annualAmount.value.currency)
  return t('premium.perWeek', { price: perWeek })
})

const monthlyWeeklyText = computed(() => {
  if (!monthlyAmount.value || monthlyAmount.value.amount <= 0) {
    return t('premium.billedMonthly', 'Billed monthly')
  }
  const perWeek = formatCurrencyAmount(monthlyAmount.value.amount / 4.33, monthlyAmount.value.currency)
  return t('premium.perWeek', { price: perWeek })
})

const annualSavingsPct = computed(() => {
  if (!annualAmount.value || !monthlyAmount.value) return 0
  if (annualAmount.value.currency !== monthlyAmount.value.currency) return 0
  const yearAtMonthly = monthlyAmount.value.amount * 12
  if (yearAtMonthly <= annualAmount.value.amount) return 0
  return Math.round(((yearAtMonthly - annualAmount.value.amount) / yearAtMonthly) * 100)
})

let offeringsLoaded = false
async function loadOfferings() {
  if (offeringsLoaded || !billingAvailable.value) return
  try {
    const offerings = await PremiumManager.getOfferings()
    if (offerings?.current) {
      offeringsLoaded = true
      const lifePkg = findPackageForPlan(offerings.current, 'lifetime')
      const lifePriceStr = getPackagePriceString(lifePkg)
      if (lifePriceStr) lifetimePrice.value = lifePriceStr

      const annualPkg = findPackageForPlan(offerings.current, 'annual')
      const annualPriceStr = getPackagePriceString(annualPkg)
      if (annualPriceStr) annualPrice.value = annualPriceStr
      annualAmount.value = getPackagePriceAmount(annualPkg)

      const monthPkg = findPackageForPlan(offerings.current, 'monthly')
      const monthPriceStr = getPackagePriceString(monthPkg)
      if (monthPriceStr) monthlyPrice.value = monthPriceStr
      monthlyAmount.value = getPackagePriceAmount(monthPkg)
    }
  } catch {
    // Graceful fallback when offerings are temporarily unreachable
  }
}

onMounted(() => {
  void loadOfferings()
})

watch(open, (isOpen) => {
  if (isOpen) void loadOfferings()
})

function selectPlan(plan: PlanId) {
  selectedPlan.value = plan
  void tickFeedback()
}

const features = computed(() => [
  t('premium.featSync', 'Synchronization of devices in real time via a shared account'),
  t('premium.featAccounts', 'Any number of accounts, debts and goals'),
  t('premium.featCategories', 'Any number of expense and income categories'),
  t('premium.featBudgets', 'Any number of budgets'),
  t('premium.featRecurring', 'Any number of scheduled and recurring payments'),
  t('premium.featExport', 'Export and import of data (CSV & JSON)'),
  t('premium.featBackup', 'Backup and restore data securely'),
  t('premium.featNoAds', '100% Ad-free and private local storage'),
])

async function onBuy() {
  if (!billingAvailable.value) {
    toast.info(
      t(
        'premium.webBillingUnavailable',
        'Online checkout is not active on web yet. You can unlock Pro in the Android app via Google Play.',
      ),
    )
    return
  }

  const suspendSheetForWebCheckout = !isNative()
  if (suspendSheetForWebCheckout) {
    checkoutSuspended.value = true
  }

  try {
    const result = await premium.buyPro(selectedPlan.value, {
      customerEmail: supabaseStore.userEmail || undefined,
      selectedLocale: locale.value === 'ru' ? 'ru' : 'en',
    })
    if (result.success) {
      toast.success(t('premium.purchaseSuccess', 'WhereDidItGo Pro unlocked! Welcome aboard.'))
    } else if (!result.cancelled) {
      const safeErr = sanitizeBillingError(
        result.error,
        t('premium.purchaseFailed', "Purchase didn't go through — try again in a moment."),
      )
      toast.error(safeErr.message)
    }
  } finally {
    checkoutSuspended.value = false
  }
}

async function onNativePaywall() {
  const result = await premium.presentNativePaywall()
  if (result.success) {
    toast.success(t('premium.purchaseSuccess', 'WhereDidItGo Pro unlocked! Welcome aboard.'))
  } else if (result.error) {
    const safeErr = sanitizeBillingError(
      result.error,
      t('premium.purchaseFailed', "Purchase didn't go through — try again in a moment."),
    )
    toast.error(safeErr.message)
  }
}

async function onRestore() {
  const restored = await premium.restore()
  toast[restored ? 'success' : 'error'](
    restored
      ? t('premium.restoreSuccess', 'Purchases restored.')
      : t('premium.restoreFailed', 'No previous purchase found for this account.'),
  )
}

async function onWatchAd() {
  const earned = await premium.watchAdForPro()
  if (earned) {
    toast.success(t('premium.adRewardSuccess', '24-hour Pro access activated!'))
  } else {
    toast.info(t('premium.adRewardCanceled', 'Watch the full video to unlock Pro pass.'))
  }
}
</script>

<template>
  <BottomSheet :open="sheetOpen" title="" @close="open = false">
    <div class="paywall-container">
      <button type="button" class="close-btn" :aria-label="t('common.close')" @click="open = false">
        <X :size="20" />
      </button>

      <!-- Hero -->
      <div class="hero">
        <div class="crown-badge">
          <Crown :size="30" class="crown-icon" />
        </div>
        <h2 class="hero-title">{{ t('premium.title', 'Unlock WhereDidItGo Pro') }}</h2>
        <p class="hero-desc">
          {{ premium.paywallReason || t('premium.subtitle', 'All future features are included at no additional cost.') }}
        </p>
      </div>

      <!-- Tiered Pricing Cards -->
      <div class="plans-grid">
        <!-- Lifetime Card -->
        <button
          type="button"
          class="plan-card plan-card--lifetime"
          :class="{ active: selectedPlan === 'lifetime' }"
          @click="selectPlan('lifetime')"
        >
          <div v-if="selectedPlan === 'lifetime'" class="selected-badge">
            <Check :size="13" />
          </div>
          <div class="plan-info">
            <div class="plan-header">
              <span class="plan-name">{{ t('premium.lifetimeTitle', 'Lifetime access') }}</span>
              <span class="plan-price">{{ lifetimePrice }}</span>
            </div>
            <span class="plan-sub">{{ t('premium.oneTimePayment', 'One time payment') }}</span>
            <span class="plan-note">{{ t('premium.lifetimeNote', 'All future features are included at no additional cost') }}</span>
          </div>
        </button>

        <!-- Annual Card -->
        <button
          type="button"
          class="plan-card"
          :class="{ active: selectedPlan === 'annual' }"
          @click="selectPlan('annual')"
        >
          <div v-if="selectedPlan === 'annual'" class="selected-badge">
            <Check :size="13" />
          </div>
          <div class="plan-info">
            <div class="plan-header">
              <div class="name-with-badge">
                <span class="plan-name">{{ t('premium.annually', 'Annually') }}</span>
                <span v-if="annualSavingsPct > 0" class="discount-pill">-{{ annualSavingsPct }}%</span>
              </div>
              <span class="plan-price">{{ annualPrice }}</span>
            </div>
            <span class="plan-sub-calc">{{ annualWeeklyText }}</span>
          </div>
        </button>

        <!-- Monthly Card -->
        <button
          type="button"
          class="plan-card"
          :class="{ active: selectedPlan === 'monthly' }"
          @click="selectPlan('monthly')"
        >
          <div v-if="selectedPlan === 'monthly'" class="selected-badge">
            <Check :size="13" />
          </div>
          <div class="plan-info">
            <div class="plan-header">
              <span class="plan-name">{{ t('premium.monthly', 'Monthly') }}</span>
              <span class="plan-price">{{ monthlyPrice }}</span>
            </div>
            <span class="plan-sub-calc">{{ monthlyWeeklyText }}</span>
          </div>
        </button>
      </div>

      <!-- Feature Checklist -->
      <div class="features-list">
        <div v-for="(feat, idx) in features" :key="idx" class="feature-item">
          <Check :size="18" class="feature-check" />
          <span class="feature-text">{{ feat }}</span>
        </div>
      </div>

      <div v-if="!billingAvailable" class="billing-notice" role="status">
        <Info :size="18" class="billing-notice-icon" />
        <span>
          {{
            t(
              'premium.webBillingUnavailable',
              'Online checkout is not active on web yet. You can unlock Pro in the Android app via Google Play.',
            )
          }}
        </span>
      </div>

      <!-- Sticky Action -->
      <div class="actions">
        <AppButton
          block
          size="lg"
          variant="filled"
          class="continue-btn"
          :loading="premium.loading"
          :disabled="premium.loading || !billingAvailable"
          @click="onBuy"
        >
          <Sparkles v-if="!premium.loading && billingAvailable" :size="20" />
          {{
            premium.loading
              ? t('common.loading')
              : billingAvailable
                ? t('premium.continue', 'Continue')
                : t('premium.unavailableCta', 'Available in Android App')
          }}
        </AppButton>

        <button
          v-if="showRewardedOption"
          type="button"
          class="rewarded-ad-btn"
          :disabled="premium.loading"
          @click="onWatchAd"
        >
          <PlayCircle :size="18" class="rewarded-icon" />
          <span>{{ t('premium.watchAdBtn', 'Watch an ad for 24h free Pro access') }}</span>
        </button>

        <button
          v-if="isNative()"
          type="button"
          class="restore-btn"
          :disabled="premium.loading"
          @click="onNativePaywall"
        >
          <Crown :size="14" />
          {{ t('premium.openNativePaywall', 'Open RevenueCat Paywall') }}
        </button>

        <button
          v-if="billingAvailable"
          type="button"
          class="restore-btn"
          :disabled="premium.loading"
          @click="onRestore"
        >
          <RefreshCw :size="14" />
          {{ t('premium.restorePurchases', 'Restore Purchases') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.paywall-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-1) var(--space-4);
  position: relative;
}

.close-btn {
  position: absolute;
  top: -4px;
  right: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.crown-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007aff, #5856d6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 122, 255, 0.35);
}

.crown-icon {
  color: #ffffff;
}

.hero-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
  font-family: var(--font-display);
}

.hero-desc {
  font-size: 0.88rem;
  color: var(--color-muted);
  max-width: 320px;
}

/* Plans Grid */
.plans-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1.5px solid var(--color-outline);
  cursor: pointer;
  text-align: left;
  transition: transform var(--duration-fast) var(--ease-spring-snappy), background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
}

.plan-card:active {
  transform: scale(0.98);
}

.plan-card.active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
  box-shadow: 0 0 0 1px var(--color-primary), 0 4px 16px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.selected-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.4);
}

.plan-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.name-with-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.plan-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.plan-price {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-on-surface);
  font-variant-numeric: tabular-nums;
}

.discount-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: #34c759;
  color: #ffffff;
}

.plan-sub {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.plan-sub-calc {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-top: 2px;
}

.plan-note {
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 4px;
}

/* Feature Checklist */
.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.feature-check {
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-text {
  font-size: 0.88rem;
  color: var(--color-on-surface);
  line-height: 1.35;
}

/* Billing Unavailable Notice */
.billing-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container));
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  font-size: 0.84rem;
  color: var(--color-on-surface-variant);
  line-height: 1.4;
}

.billing-notice-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

/* Action Buttons */
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.continue-btn {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  border-radius: var(--radius-full) !important;
  font-weight: 700 !important;
  font-size: 1.05rem !important;
  height: 52px !important;
}

.rewarded-ad-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  color: var(--color-primary);
  border: 1px solid var(--color-outline-variant);
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rewarded-ad-btn:hover {
  background: var(--color-surface-container-highest, var(--color-surface-container));
  border-color: var(--color-primary);
}

.rewarded-ad-btn:active {
  transform: scale(0.98);
}

.rewarded-ad-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rewarded-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.restore-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
}
</style>
