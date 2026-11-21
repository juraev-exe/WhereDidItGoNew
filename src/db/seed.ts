import { createId } from '@/lib/id'
import { nowISO } from '@/lib/dates'
import en from '@/i18n/locales/en'
import ru from '@/i18n/locales/ru'
import tj from '@/i18n/locales/tj'
import type { Account, AppLocale, Category } from '@/types/finance'
import { db } from './index'

const LOCALES = { en, ru, tj } as const

type SeedMessages = (typeof en)['seed']

function seedMessages(locale: AppLocale): SeedMessages {
  return LOCALES[locale].seed as SeedMessages
}

type CategoryDef = Omit<Category, 'id' | 'name'> & { nameKey: keyof SeedMessages['categories'] }

/**
 * What a fresh install gets: the categories almost everyone uses. Niche ones
 * (education, freelance) are left to the onboarding picker and the category
 * editor, so the starter list stays short enough to scan.
 */
const EXPENSE_DEFS: CategoryDef[] = [
  { nameKey: 'food', kind: 'expense', icon: 'utensils', color: '#e07a5f', sortOrder: 0 },
  { nameKey: 'transport', kind: 'expense', icon: 'car', color: '#3d5a80', sortOrder: 1 },
  { nameKey: 'housing', kind: 'expense', icon: 'home', color: '#81b29a', sortOrder: 2 },
  { nameKey: 'shopping', kind: 'expense', icon: 'shopping-bag', color: '#f2cc8f', sortOrder: 3 },
  { nameKey: 'bills', kind: 'expense', icon: 'receipt', color: '#118ab2', sortOrder: 4 },
  { nameKey: 'entertainment', kind: 'expense', icon: 'clapperboard', color: '#9b5de5', sortOrder: 5 },
  { nameKey: 'health', kind: 'expense', icon: 'heart-pulse', color: '#ef476f', sortOrder: 6 },
  { nameKey: 'other', kind: 'expense', icon: 'circle-ellipsis', color: '#6c757d', sortOrder: 7 },
]

const INCOME_DEFS: CategoryDef[] = [
  { nameKey: 'salary', kind: 'income', icon: 'briefcase', color: '#2a9d8f', sortOrder: 0 },
  { nameKey: 'gifts', kind: 'income', icon: 'gift', color: '#e9c46a', sortOrder: 1 },
  { nameKey: 'otherIncome', kind: 'income', icon: 'plus-circle', color: '#6c757d', sortOrder: 2 },
]

/**
 * No longer seeded, but still present in databases created by earlier versions.
 * Kept so a language switch relabels them like any other starter category.
 */
const RETIRED_DEFS: CategoryDef[] = [
  { nameKey: 'education', kind: 'expense', icon: 'graduation-cap', color: '#073b4c', sortOrder: 7 },
  { nameKey: 'freelance', kind: 'income', icon: 'laptop', color: '#264653', sortOrder: 1 },
]

const ALL_DEFS = [...EXPENSE_DEFS, ...INCOME_DEFS, ...RETIRED_DEFS]

/** Every localised spelling a seeded name can have, keyed by its definition. */
function defaultNamesFor(nameKey: keyof SeedMessages['categories']): string[] {
  return (Object.keys(LOCALES) as AppLocale[]).map((code) => seedMessages(code).categories[nameKey])
}

function defaultAccountNames(key: keyof SeedMessages['accounts']): string[] {
  return (Object.keys(LOCALES) as AppLocale[]).map((code) => seedMessages(code).accounts[key])
}

/**
 * Re-label the seeded categories and accounts when the language changes during
 * onboarding. Only rows still carrying a default name in *some* locale are
 * touched, so anything the user has renamed is left alone.
 */
export async function relocalizeSeedNames(locale: AppLocale): Promise<void> {
  const names = seedMessages(locale)

  const categories = await db.categories.toArray()
  const categoryPatches = categories.flatMap((cat) => {
    const def = ALL_DEFS.find(
      (d) => d.kind === cat.kind && d.icon === cat.icon && defaultNamesFor(d.nameKey).includes(cat.name),
    )
    if (!def) return []
    const next = names.categories[def.nameKey]
    return next && next !== cat.name ? [{ id: cat.id, name: next }] : []
  })
  await Promise.all(categoryPatches.map((p) => db.categories.update(p.id, { name: p.name })))

  const accounts = await db.accounts.toArray()
  const accountPatches = accounts.flatMap((acc) => {
    const key = acc.type === 'cash' ? 'cash' : acc.type === 'checking' ? 'checking' : null
    if (!key) return []
    if (!defaultAccountNames(key).includes(acc.name)) return []
    const next = names.accounts[key]
    return next && next !== acc.name ? [{ id: acc.id, name: next }] : []
  })
  await Promise.all(accountPatches.map((p) => db.accounts.update(p.id, { name: p.name })))
}

export async function ensureSeeded(currency = 'USD', locale: AppLocale = 'en'): Promise<void> {
  const names = seedMessages(locale)

  const catCount = await db.categories.count()
  if (catCount === 0) {
    const categories: Category[] = [...EXPENSE_DEFS, ...INCOME_DEFS].map((c) => ({
      id: createId('cat'),
      name: names.categories[c.nameKey],
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
    }))
    await db.categories.bulkAdd(categories)
  }

  const accountCount = await db.accounts.count()
  if (accountCount === 0) {
    const cash: Account = {
      id: createId('acc'),
      name: names.accounts.cash,
      type: 'cash',
      balance: 0,
      currency,
      color: '#0b6e6a',
      archived: false,
      createdAt: nowISO(),
    }
    const checking: Account = {
      id: createId('acc'),
      name: names.accounts.checking,
      type: 'checking',
      balance: 0,
      currency,
      color: '#3d5a80',
      archived: false,
      createdAt: nowISO(),
    }
    await db.accounts.bulkAdd([cash, checking])
  }

  const onboarding = await db.meta.get('onboardingDone')
  if (!onboarding) {
    await db.meta.put({ key: 'onboardingDone', value: 'false' })
  }
  const cur = await db.meta.get('currency')
  if (!cur) {
    await db.meta.put({ key: 'currency', value: currency })
  }
  const theme = await db.meta.get('theme')
  if (!theme) {
    await db.meta.put({ key: 'theme', value: 'dark' })
  }
  const storedLocale = await db.meta.get('locale')
  if (!storedLocale) {
    await db.meta.put({ key: 'locale', value: locale })
  }
  const currencyPosition = await db.meta.get('currencyPosition')
  if (!currencyPosition) {
    await db.meta.put({ key: 'currencyPosition', value: 'before' })
  }
  const heroMetric = await db.meta.get('heroMetric')
  if (!heroMetric) {
    await db.meta.put({ key: 'heroMetric', value: 'balance' })
  }
  const hideAmounts = await db.meta.get('hideAmounts')
  if (!hideAmounts) {
    await db.meta.put({ key: 'hideAmounts', value: 'false' })
  }
  const privacyMode = await db.meta.get('privacyMode')
  if (!privacyMode) {
    await db.meta.put({
      key: 'privacyMode',
      value: hideAmounts?.value === 'true' ? 'all' : 'none',
    })
  }
}

export async function seedDemoData(): Promise<void> {
  await ensureSeeded('USD', 'en')
  const categories = await db.categories.toArray()
  const findCat = (key: string) =>
    categories.find((c) => c.icon.includes(key) || c.name.toLowerCase().includes(key))?.id || categories[0]?.id

  const foodId = findCat('utensils')
  const transportId = findCat('car')
  const housingId = findCat('home')
  const shoppingId = findCat('shopping')
  const billsId = findCat('receipt')
  const entertainmentId = findCat('clapperboard')
  const healthId = findCat('heart')
  const salaryId = findCat('briefcase')

  const checkingId = 'acc_checking'
  const cashId = 'acc_cash'
  const savingsId = 'acc_savings'
  const creditId = 'acc_credit'

  const demoAccounts: Account[] = [
    {
      id: checkingId,
      name: 'Checking Account',
      type: 'checking',
      balance: 342000,
      currency: 'USD',
      color: '#118ab2',
      archived: false,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: cashId,
      name: 'Cash Wallet',
      type: 'cash',
      balance: 28000,
      currency: 'USD',
      color: '#81b29a',
      archived: false,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: savingsId,
      name: 'High-Yield Savings',
      type: 'savings',
      balance: 1250000,
      currency: 'USD',
      color: '#e07a5f',
      archived: false,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: creditId,
      name: 'Sapphire Credit Card',
      type: 'credit',
      balance: 45000,
      currency: 'USD',
      color: '#9b5de5',
      archived: false,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ]

  for (const acc of demoAccounts) {
    await db.accounts.put(acc)
  }

  const demoTransactions = [
    { id: 'tx_demo_1', type: 'income' as const, amount: 450000, accountId: checkingId, categoryId: salaryId, note: 'Monthly Salary Deposit', date: '2026-11-01', createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z' },
    { id: 'tx_demo_2', type: 'income' as const, amount: 85000, accountId: checkingId, categoryId: salaryId, note: 'Freelance UI Design Milestone', date: '2026-11-05', createdAt: '2026-11-05T14:30:00.000Z', updatedAt: '2026-11-05T14:30:00.000Z' },
    { id: 'tx_demo_3', type: 'expense' as const, amount: 165000, accountId: checkingId, categoryId: housingId, note: 'Apartment Rent (Nov)', date: '2026-11-01', createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z' },
    { id: 'tx_demo_4', type: 'expense' as const, amount: 14250, accountId: checkingId, categoryId: foodId, note: 'Whole Foods Groceries', date: '2026-11-03', createdAt: '2026-11-03T18:15:00.000Z', updatedAt: '2026-11-03T18:15:00.000Z' },
    { id: 'tx_demo_5', type: 'expense' as const, amount: 1420, accountId: cashId, categoryId: foodId, note: 'Blue Bottle Coffee & Croissant', date: '2026-11-04', createdAt: '2026-11-04T08:45:00.000Z', updatedAt: '2026-11-04T08:45:00.000Z' },
    { id: 'tx_demo_6', type: 'expense' as const, amount: 9000, accountId: checkingId, categoryId: transportId, note: 'Metro Monthly Pass', date: '2026-11-02', createdAt: '2026-11-02T11:00:00.000Z', updatedAt: '2026-11-02T11:00:00.000Z' },
    { id: 'tx_demo_7', type: 'expense' as const, amount: 3850, accountId: creditId, categoryId: transportId, note: 'Uber Ride to Airport', date: '2026-11-07', createdAt: '2026-11-07T16:20:00.000Z', updatedAt: '2026-11-07T16:20:00.000Z' },
    { id: 'tx_demo_8', type: 'expense' as const, amount: 12000, accountId: checkingId, categoryId: billsId, note: 'Electric & Fiber Internet', date: '2026-11-08', createdAt: '2026-11-08T12:00:00.000Z', updatedAt: '2026-11-08T12:00:00.000Z' },
    { id: 'tx_demo_9', type: 'expense' as const, amount: 2898, accountId: creditId, categoryId: entertainmentId, note: 'Netflix 4K & Spotify Family', date: '2026-11-10', createdAt: '2026-11-10T09:00:00.000Z', updatedAt: '2026-11-10T09:00:00.000Z' },
    { id: 'tx_demo_10', type: 'expense' as const, amount: 8640, accountId: creditId, categoryId: foodId, note: 'Dinner with Team at Bistro', date: '2026-11-12', createdAt: '2026-11-12T20:30:00.000Z', updatedAt: '2026-11-12T20:30:00.000Z' },
    { id: 'tx_demo_11', type: 'expense' as const, amount: 12999, accountId: creditId, categoryId: shoppingId, note: 'Running Shoes & Sports Gear', date: '2026-11-14', createdAt: '2026-11-14T15:10:00.000Z', updatedAt: '2026-11-14T15:10:00.000Z' },
    { id: 'tx_demo_12', type: 'expense' as const, amount: 4560, accountId: checkingId, categoryId: healthId, note: 'Pharmacy Vitamins & Skincare', date: '2026-11-15', createdAt: '2026-11-15T13:40:00.000Z', updatedAt: '2026-11-15T13:40:00.000Z' },
    { id: 'tx_demo_13', type: 'expense' as const, amount: 11830, accountId: checkingId, categoryId: foodId, note: 'Trader Joe Weekly Restock', date: '2026-11-16', createdAt: '2026-11-16T17:50:00.000Z', updatedAt: '2026-11-16T17:50:00.000Z' },
    { id: 'tx_demo_14', type: 'expense' as const, amount: 3200, accountId: cashId, categoryId: shoppingId, note: 'Hardcover Design Books', date: '2026-11-17', createdAt: '2026-11-17T11:20:00.000Z', updatedAt: '2026-11-17T11:20:00.000Z' },
  ]

  for (const tx of demoTransactions) {
    await db.transactions.put(tx)
  }

  const demoBudgets = [
    { id: 'b_food_nov', categoryId: foodId, month: '2026-11', limitAmount: 60000, rollover: false },
    { id: 'b_trans_nov', categoryId: transportId, month: '2026-11', limitAmount: 20000, rollover: false },
    { id: 'b_ent_nov', categoryId: entertainmentId, month: '2026-11', limitAmount: 15000, rollover: false },
    { id: 'b_shop_nov', categoryId: shoppingId, month: '2026-11', limitAmount: 25000, rollover: false },
  ]
  for (const b of demoBudgets) {
    await db.budgets.put(b)
  }

  const demoGoals = [
    { id: 'goal_tokyo', name: 'Tokyo Vacation Trip', targetAmount: 300000, currentAmount: 185000, deadline: '2027-04-15', color: '#3d5a80', icon: 'plane', createdAt: '2026-11-01T00:00:00.000Z' },
    { id: 'goal_emergency', name: 'Emergency Rainy Day Fund', targetAmount: 1000000, currentAmount: 750000, color: '#2a9d8f', icon: 'shield-check', createdAt: '2026-11-01T00:00:00.000Z' },
  ]
  for (const g of demoGoals) {
    await db.goals.put(g)
  }

  const demoDebts = [
    { id: 'debt_david', personName: 'David Miller', type: 'lent' as const, amount: 12000, paidAmount: 4000, status: 'active' as const, note: 'Concert tickets upfront', createdAt: '2026-11-06T12:00:00.000Z', updatedAt: '2026-11-06T12:00:00.000Z' },
    { id: 'debt_elena', personName: 'Elena Rostova', type: 'borrowed' as const, amount: 5000, paidAmount: 0, status: 'active' as const, note: 'Shared cab split', createdAt: '2026-11-11T18:00:00.000Z', updatedAt: '2026-11-11T18:00:00.000Z' },
  ]
  for (const d of demoDebts) {
    await db.debts.put(d)
  }

  await db.meta.put({ key: 'onboardingDone', value: 'true' })
}
