<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeftRight, Split } from '@lucide/vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { formatMoney } from '@/lib/money'
import { iconForMerchant } from '@/lib/merchantIcons'
import { formatTxDate } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import type { Transaction } from '@/types/finance'

const props = defineProps<{
  transaction: Transaction
  hideDate?: boolean
}>()

defineEmits<{ select: [] }>()

const { t } = useI18n()
const categories = useCategoriesStore()
const accounts = useAccountsStore()
const settings = useSettingsStore()

const hasSplits = computed(() => Boolean(props.transaction.splits && props.transaction.splits.length > 0))

const category = computed(() =>
  props.transaction.categoryId ? categories.byId(props.transaction.categoryId) : null,
)

const subcategory = computed(() => {
  if (!category.value || !props.transaction.subcategoryId) return null
  return category.value.subcategories?.find((s) => s.id === props.transaction.subcategoryId) ?? null
})

const account = computed(() => accounts.byId(props.transaction.accountId))

const icon = computed(() => iconForMerchant(props.transaction.note) ?? category.value?.icon ?? 'circle')

const label = computed(() => {
  if (props.transaction.type === 'transfer') {
    const to = props.transaction.toAccountId
      ? (accounts.byId(props.transaction.toAccountId)?.name ?? '?')
      : (props.transaction.note.trim() || t('goals.title'))
    return `${account.value?.name ?? '?'} → ${to}`
  }
  const note = props.transaction.note.trim()
  if (note) {
    return subcategory.value ? `${note} (${subcategory.value.name})` : note
  }
  if (hasSplits.value) {
    return t('splits.splitTitle')
  }
  if (category.value) {
    return subcategory.value ? `${category.value.name} · ${subcategory.value.name}` : category.value.name
  }
  return t('transaction.uncategorized')
})

const subtitle = computed(() => {
  const date = formatTxDate(props.transaction.date, settings.intlLocale)
  if (props.transaction.type === 'transfer') return props.hideDate ? '' : date
  const parts = props.hideDate ? [] : [date]

  if (hasSplits.value && props.transaction.splits?.length) {
    const splitSummary = props.transaction.splits
      .map((s) => {
        const cat = categories.byId(s.categoryId)?.name ?? t('transaction.uncategorized')
        const formattedAmount = formatMoney(
          s.amount,
          settings.currency,
          settings.intlLocale,
          settings.currencyPosition,
          settings.hideCents,
        )
        return `${cat} (${formattedAmount})`
      })
      .join(', ')
    parts.push(splitSummary)
  } else {
    const note = props.transaction.note.trim()
    if (note && category.value) {
      const catLabel = subcategory.value ? `${category.value.name} · ${subcategory.value.name}` : category.value.name
      parts.push(catLabel)
    }
  }

  if (account.value) parts.push(account.value.name)
  return parts.join(' · ')
})

const amountClass = computed(() => {
  if (props.transaction.type === 'income') return 'amount--income'
  if (props.transaction.type === 'expense') return 'amount--expense'
  return 'amount--transfer'
})

const iconBg = computed(() => {
  if (props.transaction.type === 'transfer') {
    return 'color-mix(in srgb, var(--color-transfer) 18%, transparent)'
  }
  if (hasSplits.value) {
    return 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)'
  }
  const c = category.value?.color ?? '#6c757d'
  return `color-mix(in srgb, ${c} 22%, transparent)`
})
</script>

<template>
  <button type="button" class="row" @click="$emit('select')">
    <span class="icon" :style="{ background: iconBg }">
      <ArrowLeftRight v-if="transaction.type === 'transfer'" :size="18" />
      <Split v-else-if="hasSplits" :size="18" />
      <IconByName v-else :name="icon" :size="18" />
    </span>
    <span class="meta">
      <span class="title">
        <span class="title-text">{{ label }}</span>
        <span v-if="hasSplits" class="split-badge">
          <Split :size="10" />
          {{ t('splits.badge') }}
        </span>
      </span>
      <span v-if="subtitle" class="sub">{{ subtitle }}</span>
    </span>
    <span class="amount" :class="amountClass">
      <MoneyText :amount="transaction.amount" :signed="transaction.type" />
    </span>
  </button>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3) var(--space-3);
  margin: 1px 0;
  border-radius: var(--radius-md);
  text-align: left;
  min-height: var(--touch-min);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
  transition:
    background var(--duration-fast) var(--ease-standard),
    transform 140ms var(--ease-spring-snappy);
  cursor: pointer;
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.row:nth-child(1) { animation-delay: 60ms; }
.row:nth-child(2) { animation-delay: 120ms; }
.row:nth-child(3) { animation-delay: 180ms; }
.row:nth-child(4) { animation-delay: 240ms; }
.row:nth-child(5) { animation-delay: 300ms; }

.row:hover {
  background: color-mix(in srgb, var(--color-surface-container) 60%, transparent);
}

.row:active {
  transform: scale(0.978);
  transition-duration: 60ms;
  background: var(--color-surface-container);
}

.icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: var(--color-on-surface);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.row:hover .icon {
  transform: scale(1.05);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  font-size: var(--text-body);
  min-width: 0;
  color: var(--color-on-surface);
}

.title-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.split-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-radius: var(--radius-sm, 6px);
  background: color-mix(in srgb, var(--color-primary, #6366f1) 14%, transparent);
  color: var(--color-primary, #6366f1);
  border: 1px solid color-mix(in srgb, var(--color-primary, #6366f1) 24%, transparent);
  flex-shrink: 0;
  line-height: 1.2;
}

.sub {
  font-size: var(--text-caption);
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  font-size: 0.98rem;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.amount--income {
  color: var(--color-income);
}

.amount--expense {
  color: var(--color-on-surface);
}

.amount--transfer {
  color: var(--color-transfer);
}
</style>
