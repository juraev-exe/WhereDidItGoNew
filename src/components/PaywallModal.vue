<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Crown, RefreshCw, Sparkles, Star, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePremiumStore } from '@/stores/premium'
import { tickFeedback } from '@/services/native/haptics'

const { t } = useI18n()
const premium = usePremiumStore()

const open = computed({
  get: () => premium.paywallOpen,
  set: (val) => {
    if (!val) premium.closePaywall()
  },
})

type PlanId = 'lifetime' | 'annual' | 'monthly'
const selectedPlan = ref<PlanId>('lifetime')

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
  await premium.buyPro()
}

async function onRestore() {
  await premium.restore()
}
</script>

<template>
  <BottomSheet :open="open" title="" @close="open = false">
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
              <span class="plan-price">$26.97</span>
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
                <span class="discount-pill">-28%</span>
              </div>
              <span class="plan-price">$9.29</span>
            </div>
            <span class="plan-sub-calc">(Per week: $0.18)</span>
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
              <span class="plan-price">$1.09</span>
            </div>
            <span class="plan-sub-calc">(Per week: $0.28)</span>
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

      <!-- Social Proof Card -->
      <div class="review-card">
        <div class="stars-row">
          <Star v-for="s in 5" :key="s" :size="16" class="star-icon" />
        </div>
        <p class="review-quote">
          “{{ t('premium.reviewQuote', "I've tried so many budget apps and none of them did it for me. This one exceeded my expectations — clean, fast, and private.") }}”
        </p>
      </div>

      <!-- Sticky Action -->
      <div class="actions">
        <AppButton block size="lg" variant="filled" class="continue-btn" :disabled="premium.loading" @click="onBuy">
          <Sparkles :size="20" />
          {{ premium.loading ? t('common.loading') : t('premium.continue', 'Continue') }}
        </AppButton>

        <button type="button" class="restore-btn" :disabled="premium.loading" @click="onRestore">
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
  transition: all var(--duration-fast) var(--ease-spring);
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

/* Review Card */
.review-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
}

.stars-row {
  display: flex;
  gap: 3px;
}

.star-icon {
  color: #ff9500;
  fill: #ff9500;
}

.review-quote {
  font-size: 0.84rem;
  color: var(--color-on-surface);
  line-height: 1.4;
  font-style: italic;
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
