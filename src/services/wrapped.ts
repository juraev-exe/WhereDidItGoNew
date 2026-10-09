import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns'
import { isInMonth, monthKey, previousMonthKey, monthRange, parseLocalDay } from '@/lib/dates'
import type { Budget, Category, Debt, Transaction } from '@/types/finance'
import i18n from '@/i18n'
import { budgetProgress } from './stats'

export interface WrappedCategory {
  id: string
  name: string
  amount: number
  percent: number
  icon: string
  color: string
}

export interface WrappedBadge {
  id: string
  title: string
  subtitle: string
  icon: string
  gradient: string
}

export interface WrappedData {
  monthKey: string
  monthLabel: string
  totalInflow: number
  totalOutflow: number
  netSavings: number
  savingsRate: number
  savingsRateDelta: number
  topCategories: WrappedCategory[]
  topCategory: WrappedCategory | null
  biggestExpense: {
    amount: number
    note: string
    categoryName: string
    date: string
  } | null
  busiestDayOfWeek: {
    dayName: string
    count: number
    totalAmount: number
  } | null
  dailyAverage: number
  totalTransactions: number
  debtsPaidTotal: number
  badge: WrappedBadge
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function computeWrappedData(
  targetMonth: string = monthKey(),
  transactions: Transaction[],
  categories: Category[],
  debts: Debt[] = [],
  budgets: Budget[] = [],
): WrappedData {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const prevMonth = previousMonthKey(targetMonth)

  // Current month transactions
  const monthTxs = transactions.filter((t) => isInMonth(t.date, targetMonth))
  const prevMonthTxs = transactions.filter((t) => isInMonth(t.date, prevMonth))

  // Inflow & Outflow
  let totalInflow = 0
  let totalOutflow = 0
  const spendByCat = new Map<string, number>()
  const dayOfWeekCount = new Array(7).fill(0)
  const dayOfWeekSpend = new Array(7).fill(0)
  let biggestExpense: WrappedData['biggestExpense'] = null

  for (const t of monthTxs) {
    if (t.type === 'income') {
      totalInflow += t.amount
    } else if (t.type === 'expense') {
      totalOutflow += t.amount

      // Category accumulation
      const cid = t.categoryId || 'uncategorized'
      spendByCat.set(cid, (spendByCat.get(cid) || 0) + t.amount)

      // Day of week
      try {
        const d = parseISO(t.date)
        const dayIdx = d.getDay()
        dayOfWeekCount[dayIdx]++
        dayOfWeekSpend[dayIdx] += t.amount
      } catch {
        // ignore date parse issues
      }

      // Biggest expense
      if (!biggestExpense || t.amount > biggestExpense.amount) {
        const cat = t.categoryId ? catMap.get(t.categoryId) : null
        biggestExpense = {
          amount: t.amount,
          note: t.note || (cat ? cat.name : 'Expense'),
          categoryName: cat ? cat.name : 'General',
          date: t.date,
        }
      }
    }
  }

  // Previous month calculations for delta
  let prevInflow = 0
  let prevOutflow = 0
  for (const t of prevMonthTxs) {
    if (t.type === 'income') prevInflow += t.amount
    else if (t.type === 'expense') prevOutflow += t.amount
  }

  const netSavings = totalInflow - totalOutflow
  const savingsRate =
    totalInflow > 0 ? Math.max(0, Math.round(((totalInflow - totalOutflow) / totalInflow) * 100)) : 0
  const prevSavingsRate =
    prevInflow > 0 ? Math.max(0, Math.round(((prevInflow - prevOutflow) / prevInflow) * 100)) : 0
  const savingsRateDelta = savingsRate - prevSavingsRate

  // Top categories
  const sortedCatEntries = Array.from(spendByCat.entries()).sort((a, b) => b[1] - a[1])
  const topCategories: WrappedCategory[] = sortedCatEntries.slice(0, 3).map(([id, amount]) => {
    const cat = catMap.get(id)
    return {
      id,
      name: cat ? cat.name : 'Other',
      amount,
      percent: totalOutflow > 0 ? Math.round((amount / totalOutflow) * 100) : 0,
      icon: cat ? cat.icon : 'tag',
      color: cat ? cat.color : '#06b6d4',
    }
  })

  const topCategory = topCategories.length > 0 ? topCategories[0] : null

  // Busiest day of week
  let maxDayIdx = 5 // Friday default
  let maxDayCount = 0
  for (let i = 0; i < 7; i++) {
    if (dayOfWeekCount[i] > maxDayCount) {
      maxDayCount = dayOfWeekCount[i]
      maxDayIdx = i
    }
  }
  const busiestDayOfWeek =
    maxDayCount > 0
      ? {
          dayName: DAY_NAMES[maxDayIdx],
          count: maxDayCount,
          totalAmount: dayOfWeekSpend[maxDayIdx],
        }
      : null

  // Daily average (actual elapsed days)
  const start = parseLocalDay(monthRange(targetMonth).start)
  const end = parseLocalDay(monthRange(targetMonth).end)
  const today = startOfDay(new Date())
  const daysInMonth = differenceInCalendarDays(end, start) + 1
  let elapsedDays = daysInMonth
  if (today < end && today >= start) {
    elapsedDays = differenceInCalendarDays(today, start) + 1
  } else if (today < start) {
    elapsedDays = 1
  }
  const dailyAverage = Math.round(totalOutflow / elapsedDays)

  // Lifetime borrowed-debts repayments made
  const lifetimeDebtsPaidTotal = debts
    .filter(d => d.type === 'borrowed')
    .reduce((sum, d) => sum + (d.paidAmount || 0), 0)

  // Achievement Badge determination
  let badge: WrappedBadge = {
    id: 'mindful-tracker',
    title: String(i18n.global.t('insights.badgeMindfulTrackerTitle', 'Mindful Tracker')),
    subtitle: String(i18n.global.t('insights.badgeMindfulTrackerSub', 'Taking charge of personal financial awareness')),
    icon: '✨',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  }

  const progress = budgetProgress(budgets, transactions, categories, targetMonth)
  const allWithinBudget =
    progress.length > 0 &&
    progress.every((row) => row.spent <= row.effectiveLimit)

  if (allWithinBudget && savingsRate >= 20) {
    badge = {
      id: 'budget-guardian',
      title: String(i18n.global.t('insights.badgeBudgetGuardianTitle', 'Budget Guardian')),
      subtitle: String(i18n.global.t('insights.badgeBudgetGuardianSub', { count: progress.length }, `Stayed 100% within limits across all ${progress.length} envelopes`)),
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    }
  } else if (savingsRate >= 40 && totalInflow > 0) {
    badge = {
      id: 'savings-titan',
      title: String(i18n.global.t('insights.badgeSavingsTitanTitle', 'Savings Titan')),
      subtitle: String(i18n.global.t('insights.badgeSavingsTitanSub', { rate: savingsRate }, `Incredible ${savingsRate}% savings rate achieved this month`)),
      icon: '💎',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    }
  } else if (savingsRate >= 20 && totalInflow > 0) {
    badge = {
      id: 'frugal-master',
      title: String(i18n.global.t('insights.badgeFrugalMasterTitle', 'Frugal Master')),
      subtitle: String(i18n.global.t('insights.badgeFrugalMasterSub', 'Maintained a healthy 20%+ savings buffer')),
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    }
  } else if (lifetimeDebtsPaidTotal > 0 && debts.some(d => d.type === 'borrowed')) {
    badge = {
      id: 'debt-crusher',
      title: String(i18n.global.t('insights.badgeDebtCrusherTitle', 'Debt Crusher')),
      subtitle: String(i18n.global.t('insights.badgeDebtCrusherSub', 'Actively paying down loans and liabilities (Lifetime)')),
      icon: '⚡',
      gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    }
  } else if (monthTxs.length >= 20) {
    badge = {
      id: 'consistency-champion',
      title: String(i18n.global.t('insights.badgeConsistencyChampionTitle', 'Consistency Champion')),
      subtitle: String(i18n.global.t('insights.badgeConsistencyChampionSub', { count: monthTxs.length }, `Logged ${monthTxs.length} transactions with meticulous detail`)),
      icon: '🏆',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    }
  }

  // Month label (e.g. "August 2026")
  let monthLabel = targetMonth
  try {
    const parts = targetMonth.split('-')
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1)
    monthLabel = format(d, 'MMMM yyyy')
  } catch {
    // fallback
  }

  return {
    monthKey: targetMonth,
    monthLabel,
    totalInflow,
    totalOutflow,
    netSavings,
    savingsRate,
    savingsRateDelta,
    topCategories,
    topCategory,
    biggestExpense,
    busiestDayOfWeek,
    dailyAverage,
    totalTransactions: monthTxs.length,
    debtsPaidTotal: lifetimeDebtsPaidTotal,
    badge,
  }
}
