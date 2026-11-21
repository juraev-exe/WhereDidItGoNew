<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Calendar,
  CheckCircle2,
  Flame,
  Share2,
  Sparkles,
  X,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { Share } from '@capacitor/share'
import { isNative } from '@/lib/platform'
import { tickFeedback, successFeedback } from '@/services/native/haptics'
import type { WrappedData } from '@/services/wrapped'

const props = defineProps<{
  open: boolean
  data: WrappedData
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const TOTAL_SLIDES = 5
const SLIDE_DURATION = 5500 // 5.5s per slide

const currentSlide = ref(0)
const isPaused = ref(false)
const slideProgress = ref(0)
let timerId: ReturnType<typeof setInterval> | null = null
let slideStartTime = Date.now()

function startSlideTimer() {
  stopSlideTimer()
  slideStartTime = Date.now()
  slideProgress.value = 0

  timerId = setInterval(() => {
    if (isPaused.value) {
      slideStartTime += 50
      return
    }
    const elapsed = Date.now() - slideStartTime
    slideProgress.value = Math.min(100, (elapsed / SLIDE_DURATION) * 100)

    if (elapsed >= SLIDE_DURATION) {
      nextSlide()
    }
  }, 50)
}

function stopSlideTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function nextSlide() {
  if (currentSlide.value < TOTAL_SLIDES - 1) {
    currentSlide.value++
    void tickFeedback()
    startSlideTimer()
  } else {
    // End of story
    stopSlideTimer()
    slideProgress.value = 100
  }
}

function prevSlide() {
  if (currentSlide.value > 0) {
    currentSlide.value--
    void tickFeedback()
    startSlideTimer()
  } else {
    startSlideTimer()
  }
}

function onContainerClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.interactive-btn') || target.closest('.close-btn')) {
    return
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const clickX = e.clientX - rect.left
  if (clickX < rect.width * 0.3) {
    prevSlide()
  } else {
    nextSlide()
  }
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'ArrowRight' || e.key === ' ') {
    nextSlide()
  } else if (e.key === 'ArrowLeft') {
    prevSlide()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function pauseTimer() {
  isPaused.value = true
}

function resumeTimer() {
  isPaused.value = false
}

async function shareWrapped() {
  void successFeedback()
  const summaryText = `✨ WhereDidItGo Wrapped (${props.data.monthLabel})\n` +
    `💸 Savings Rate: ${props.data.savingsRate}%\n` +
    `🏆 Superpower: ${props.data.badge.title} (${props.data.badge.subtitle})\n` +
    (props.data.topCategory ? `🔥 #1 Spend: ${props.data.topCategory.name}\n` : '') +
    `100% private & local-first personal finance.`

  if (isNative()) {
    try {
      await Share.share({
        title: `WhereDidItGo Wrapped - ${props.data.monthLabel}`,
        text: summaryText,
        dialogTitle: 'Share your Wrapped',
      })
      return
    } catch {
      // fallback to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(summaryText)
    alert(t('insights.wrappedCopied', 'Summary copied to clipboard!'))
  } catch {
    // ignore
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      currentSlide.value = 0
      startSlideTimer()
      window.addEventListener('keydown', onKey)
    } else {
      stopSlideTimer()
      window.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  stopSlideTimer()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="open" class="wrapped-backdrop" @pointerdown="pauseTimer" @pointerup="resumeTimer" @mouseleave="resumeTimer">
    <div class="wrapped-container" @click="onContainerClick">
      <!-- Story Progress Bars (Instagram/Spotify Stories style) -->
      <div class="progress-bars-row">
        <div
          v-for="idx in TOTAL_SLIDES"
          :key="idx"
          class="progress-bar-track"
        >
          <div
            class="progress-bar-fill"
            :style="{
              width:
                idx - 1 < currentSlide
                  ? '100%'
                  : idx - 1 === currentSlide
                    ? `${slideProgress}%`
                    : '0%',
            }"
          />
        </div>
      </div>

      <!-- Top Header -->
      <div class="story-header">
        <div class="story-badge-pill">
          <Sparkles :size="14" class="text-amber-300" />
          <span>{{ data.monthLabel }} Wrapped</span>
        </div>
        <button type="button" class="close-btn" @click.stop="emit('close')">
          <X :size="22" />
        </button>
      </div>

      <!-- SLIDE 0: Overview & Savings Rate -->
      <div v-if="currentSlide === 0" class="slide-content slide-0">
        <div class="glow-orb orb-emerald" />
        <span class="slide-tag">{{ t('insights.wrappedTagOverview', 'THE BIG PICTURE') }}</span>
        <h2 class="slide-title">{{ t('insights.wrappedMonthOverview', 'Your Month in Numbers') }}</h2>

        <div class="hero-metric-box surface-glass">
          <span class="metric-caption">{{ t('insights.wrappedTotalSpent', 'Total Money Spent') }}</span>
          <div class="huge-money text-rose">
            <MoneyText :amount="data.totalOutflow" />
          </div>
          <div class="sub-stats-row">
            <div class="sub-stat">
              <span class="sub-label">{{ t('insights.wrappedInflow', 'Earned') }}</span>
              <span class="sub-val text-emerald"><MoneyText :amount="data.totalInflow" /></span>
            </div>
            <div class="stat-divider" />
            <div class="sub-stat">
              <span class="sub-label">{{ t('insights.wrappedNetSavings', 'Net Saved') }}</span>
              <span class="sub-val" :class="data.netSavings >= 0 ? 'text-emerald' : 'text-rose'">
                <MoneyText :amount="data.netSavings" />
              </span>
            </div>
          </div>
        </div>

        <div class="savings-card surface-glass">
          <div class="savings-circle">
            <strong>{{ data.savingsRate }}%</strong>
            <small>{{ t('insights.wrappedSaved', 'SAVED') }}</small>
          </div>
          <div class="savings-info">
            <h4>{{ t('insights.wrappedSavingsRate', 'Savings Rate') }}</h4>
            <p v-if="data.savingsRateDelta > 0" class="text-emerald">
              ▲ +{{ data.savingsRateDelta }}% {{ t('insights.wrappedVsLastMonth', 'higher than last month!') }}
            </p>
            <p v-else-if="data.savingsRate >= 20">
              {{ t('insights.wrappedHealthyBuffer', 'Great work maintaining a solid safety buffer.') }}
            </p>
            <p v-else>
              {{ t('insights.wrappedKeepGoing', 'Every dollar tracked builds financial awareness.') }}
            </p>
          </div>
        </div>
      </div>

      <!-- SLIDE 1: Top Category -->
      <div v-else-if="currentSlide === 1" class="slide-content slide-1">
        <div class="glow-orb orb-violet" />
        <span class="slide-tag">{{ t('insights.wrappedTagCategory', '#1 SPENDING OBSESSION') }}</span>
        <h2 class="slide-title">{{ t('insights.wrappedWhereWent', 'Where Did It Go?') }}</h2>

        <div v-if="data.topCategory" class="top-cat-hero surface-glass">
          <div
            class="top-cat-icon-halo"
            :style="{ background: `color-mix(in srgb, ${data.topCategory.color} 30%, transparent)` }"
          >
            <IconByName :name="data.topCategory.icon" :size="36" />
          </div>
          <h3 class="top-cat-name">{{ data.topCategory.name }}</h3>
          <div class="top-cat-amount">
            <MoneyText :amount="data.topCategory.amount" />
          </div>
          <span class="top-cat-pct-badge">
            {{ data.topCategory.percent }}% {{ t('insights.wrappedOfAllSpend', 'of all spending') }}
          </span>
        </div>

        <div v-if="data.topCategories.length > 1" class="runner-ups-list surface-glass">
          <div
            v-for="(cat, i) in data.topCategories.slice(1)"
            :key="cat.id"
            class="runner-up-item"
          >
            <span class="runner-rank">#{{ i + 2 }}</span>
            <span class="runner-name">{{ cat.name }}</span>
            <span class="runner-amt"><MoneyText :amount="cat.amount" /></span>
          </div>
        </div>
      </div>

      <!-- SLIDE 2: Splurge & Day Rhythm -->
      <div v-else-if="currentSlide === 2" class="slide-content slide-2">
        <div class="glow-orb orb-amber" />
        <span class="slide-tag">{{ t('insights.wrappedTagPatterns', 'SPENDING RHYTHM') }}</span>
        <h2 class="slide-title">{{ t('insights.wrappedPatternsTitle', 'Your Daily Habits') }}</h2>

        <div v-if="data.biggestExpense" class="splurge-card surface-glass">
          <div class="splurge-header">
            <Flame :size="20" class="text-amber-400" />
            <span>{{ t('insights.wrappedBiggestSplurge', 'Single Biggest Outflow') }}</span>
          </div>
          <div class="splurge-amount">
            <MoneyText :amount="data.biggestExpense.amount" />
          </div>
          <p class="splurge-note">“{{ data.biggestExpense.note }}”</p>
          <small class="splurge-date">{{ data.biggestExpense.date }}</small>
        </div>

        <div v-if="data.busiestDayOfWeek" class="day-rhythm-card surface-glass">
          <div class="day-icon">
            <Calendar :size="22" class="text-cyan-400" />
          </div>
          <div>
            <h4>{{ data.busiestDayOfWeek.dayName }}s {{ t('insights.wrappedFavDay', 'were your favorite!') }}</h4>
            <p>
              {{ data.busiestDayOfWeek.count }} {{ t('insights.wrappedTxsTotal', 'transactions totaling') }}
              <strong><MoneyText :amount="data.busiestDayOfWeek.totalAmount" /></strong>
            </p>
          </div>
        </div>
      </div>

      <!-- SLIDE 3: Financial Superpower & Badge -->
      <div v-else-if="currentSlide === 3" class="slide-content slide-3">
        <div class="glow-orb orb-pink" />
        <span class="slide-tag">{{ t('insights.wrappedTagBadge', 'SUPERPOWER UNLOCKED') }}</span>
        <h2 class="slide-title">{{ t('insights.wrappedBadgeTitle', 'Your Financial Identity') }}</h2>

        <div class="badge-hero-card surface-glass">
          <div class="badge-emoji-box" :style="{ background: data.badge.gradient }">
            <span class="badge-emoji">{{ data.badge.icon }}</span>
          </div>
          <h3 class="badge-title">{{ data.badge.title }}</h3>
          <p class="badge-subtitle">{{ data.badge.subtitle }}</p>

          <div class="milestones-row">
            <div class="milestone-box">
              <strong>{{ data.totalTransactions }}</strong>
              <small>{{ t('insights.wrappedLoggedTxs', 'Logged Txs') }}</small>
            </div>
            <div v-if="data.debtsPaidTotal > 0" class="milestone-box">
              <strong><MoneyText :amount="data.debtsPaidTotal" /></strong>
              <small>{{ t('insights.wrappedDebtsRepaid', 'Lifetime Debts Paid') }}</small>
            </div>
            <div class="milestone-box">
              <strong><MoneyText :amount="data.dailyAverage" /></strong>
              <small>{{ t('insights.wrappedDailyAvg', 'Daily Burn') }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- SLIDE 4: Master Wrapped Summary & Share -->
      <div v-else-if="currentSlide === 4" class="slide-content slide-4">
        <div class="glow-orb orb-cyan" />
        <span class="slide-tag">{{ t('insights.wrappedTagComplete', 'READY TO SHARE') }}</span>
        <h2 class="slide-title">{{ t('insights.wrappedSummaryTitle', 'WhereDidItGo Wrapped') }}</h2>

        <!-- Shareable card -->
        <div class="summary-share-card surface-glass">
          <div class="share-card-header">
            <div class="brand-row">
              <Sparkles :size="18" class="text-cyan-400" />
              <strong>WhereDidItGo</strong>
            </div>
            <span class="month-pill">{{ data.monthLabel }}</span>
          </div>

          <div class="share-badge-highlight">
            <span class="share-icon">{{ data.badge.icon }}</span>
            <div>
              <h4>{{ data.badge.title }}</h4>
              <p>{{ data.badge.subtitle }}</p>
            </div>
          </div>

          <div class="share-stats-grid">
            <div class="share-stat">
              <small>{{ t('insights.wrappedSpent', 'Spent') }}</small>
              <strong><MoneyText :amount="data.totalOutflow" /></strong>
            </div>
            <div class="share-stat">
              <small>{{ t('insights.wrappedSavingsRate', 'Savings') }}</small>
              <strong class="text-emerald">{{ data.savingsRate }}%</strong>
            </div>
            <div v-if="data.topCategory" class="share-stat">
              <small>{{ t('insights.wrappedTopCategory', 'Top Category') }}</small>
              <strong>{{ data.topCategory.name }}</strong>
            </div>
            <div class="share-stat">
              <small>{{ t('insights.wrappedTransactions', 'Entries') }}</small>
              <strong>{{ data.totalTransactions }}</strong>
            </div>
          </div>

          <div class="privacy-seal">
            <CheckCircle2 :size="14" class="text-emerald-400" />
            <span>100% Local-First & Private</span>
          </div>
        </div>

        <div class="action-buttons-wrap interactive-btn">
          <AppButton block variant="filled" size="lg" class="share-btn" @click.stop="shareWrapped">
            <Share2 :size="18" />
            <span>{{ t('insights.wrappedShareBtn', 'Share My Wrapped') }}</span>
          </AppButton>
          <AppButton block variant="tonal" size="md" class="close-pill-btn" @click.stop="emit('close')">
            {{ t('common.close', 'Close') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapped-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.wrapped-container {
  position: relative;
  width: 100%;
  max-width: 410px;
  height: 92vh;
  max-height: 800px;
  background: radial-gradient(130% 100% at 50% 0%, #151a2a 0%, #080a10 100%);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px -10px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.25rem 1.5rem;
  box-sizing: border-box;
  overflow: hidden;
}

/* Progress bar segments at the top */
.progress-bars-row {
  display: flex;
  gap: 6px;
  margin-bottom: 0.9rem;
}

.progress-bar-track {
  flex: 1;
  height: 3.5px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2dd4bf, #38bdf8);
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.5);
  border-radius: 9999px;
  transition: width 0.05s linear;
}

/* Header */
.story-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  z-index: 10;
}

.story-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.78rem;
  font-weight: 700;
  color: #f1f5f9;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.close-btn:active {
  transform: scale(0.92);
}

/* Slide general content */
.slide-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: slideFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  z-index: 5;
}

@keyframes slideFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.slide-tag {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #2dd4bf;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.slide-title {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 1.25rem;
  line-height: 1.2;
}

/* Glow Orbs */
.glow-orb {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 1;
  opacity: 0.35;
}

.orb-emerald {
  background: #10b981;
  top: 10%;
  left: 20%;
}

.orb-violet {
  background: #8b5cf6;
  top: 25%;
  right: 10%;
}

.orb-amber {
  background: #f59e0b;
  top: 15%;
  left: 15%;
}

.orb-pink {
  background: #ec4899;
  top: 20%;
  right: 15%;
}

.orb-cyan {
  background: #06b6d4;
  top: 10%;
  left: 25%;
}

/* Glass components */
.hero-metric-box {
  padding: 1.35rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 1rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.metric-caption {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.huge-money {
  font-size: 2.35rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  margin: 0.35rem 0 0.85rem;
}

.sub-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sub-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.sub-val {
  font-size: 1.05rem;
  font-weight: 800;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
}

.savings-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.savings-circle {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: conic-gradient(#10b981 0% 80%, rgba(255, 255, 255, 0.1) 80% 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}

.savings-circle strong {
  font-size: 1.1rem;
  font-weight: 900;
  color: #fff;
}

.savings-circle small {
  font-size: 0.55rem;
  font-weight: 800;
  color: #a7f3d0;
  letter-spacing: 0.05em;
}

.savings-info h4 {
  font-size: 0.98rem;
  font-weight: 800;
  margin: 0 0 3px;
  color: #fff;
}

.savings-info p {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.35;
}

/* Slide 1 Top Category */
.top-cat-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.6rem 1rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 1rem;
  text-align: center;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.top-cat-icon-halo {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.85rem;
  box-shadow: 0 0 35px rgba(139, 92, 246, 0.45);
}

.top-cat-name {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.35rem;
}

.top-cat-amount {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 0.5rem;
}

.top-cat-pct-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(139, 92, 246, 0.25);
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: #ddd6fe;
  font-size: 0.78rem;
  font-weight: 700;
}

.runner-ups-list {
  padding: 0.9rem 1.2rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.runner-up-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.88rem;
}

.runner-rank {
  font-weight: 800;
  color: #94a3b8;
  width: 26px;
}

.runner-name {
  flex: 1;
  color: #e2e8f0;
  font-weight: 500;
}

.runner-amt {
  font-weight: 700;
  color: #fff;
}

/* Slide 2 Splurge & Rhythm */
.splurge-card {
  padding: 1.35rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 1rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.splurge-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fbbf24;
  margin-bottom: 0.5rem;
}

.splurge-amount {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
}

.splurge-note {
  font-size: 0.95rem;
  color: #e2e8f0;
  margin: 0.35rem 0;
  font-style: italic;
}

.splurge-date {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.day-rhythm-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.day-icon {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid rgba(6, 182, 212, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.day-rhythm-card h4 {
  font-size: 0.98rem;
  font-weight: 800;
  margin: 0 0 2px;
  color: #fff;
}

.day-rhythm-card p {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

/* Slide 3 Superpower Badge */
.badge-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.85rem 1.25rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.badge-emoji-box {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.badge-emoji {
  font-size: 2.85rem;
}

.badge-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 0.35rem;
}

.badge-subtitle {
  font-size: 0.88rem;
  color: #cbd5e1;
  margin: 0 0 1.5rem;
  line-height: 1.4;
}

.milestones-row {
  display: flex;
  width: 100%;
  justify-content: space-around;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.milestone-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.milestone-box strong {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}

.milestone-box small {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

/* Slide 4 Summary & Share */
.summary-share-card {
  padding: 1.35rem;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
}

.share-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.month-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
}

.share-badge-highlight {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1rem;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(45, 212, 191, 0.08) 100%);
  border: 1px solid rgba(56, 189, 248, 0.28);
  margin-bottom: 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.share-icon {
  font-size: 2.2rem;
  flex-shrink: 0;
}

.share-badge-highlight h4 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.share-badge-highlight p {
  font-size: 0.78rem;
  margin: 2px 0 0;
  color: #94a3b8;
  line-height: 1.35;
}

.share-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.share-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.2s ease;
}

.share-stat small {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.share-stat strong {
  font-size: 1.25rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: -0.02em;
}

.privacy-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 9999px;
  padding: 6px 14px;
  margin: 0 auto;
}

.action-buttons-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.share-btn {
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border-radius: 9999px !important;
  height: 48px !important;
  border: none !important;
  box-shadow: 0 10px 25px -4px rgba(14, 165, 233, 0.45) !important;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.share-btn:active {
  transform: scale(0.97) !important;
}

.close-pill-btn {
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #e2e8f0 !important;
  border-radius: 9999px !important;
  height: 44px !important;
  font-weight: 600 !important;
  transition: transform 0.15s ease !important;
}

.close-pill-btn:active {
  transform: scale(0.97) !important;
}

/* Colors */
.text-rose {
  color: #f43f5e;
}

.text-emerald {
  color: #10b981;
}
</style>
