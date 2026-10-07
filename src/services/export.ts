import { format } from 'date-fns'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from '@/lib/platform'
import { isInRange } from '@/lib/dates'
import type { Account, Category, Transaction } from '@/types/finance'
import {
  summarizeRange,
  type DetailedCategorySpend,
  type ExecutiveKpis,
  type InsightsPeriod,
  type StatsRange,
} from '@/services/stats'

export interface AnalyticsReportOptions {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  range: StatsRange
  rangeLabel: string
  period: InsightsPeriod
  kpis: ExecutiveKpis
  detailedCategories: DetailedCategorySpend[]
  currency: string
  locale?: string
}

function escapeCell(val: unknown): string {
  if (val == null) return '""'
  const str = String(val)
  return '"' + str.replaceAll('"', '""') + '"'
}

function row(cells: unknown[]): string {
  return cells.map(escapeCell).join(',')
}

/**
 * Builds a structured, multi-section CSV string with UTF-8 BOM for Excel compatibility.
 */
export function generateAnalyticsReportCsv(opts: AnalyticsReportOptions): string {
  const {
    transactions,
    categories,
    accounts,
    range,
    rangeLabel,
    period,
    kpis,
    detailedCategories,
    currency,
  } = opts

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]))
  const subMap = Object.fromEntries(
    categories.flatMap((c) => (c.subcategories ?? []).map((s) => [s.id, s.name])),
  )

  const lines: string[] = []

  // 1. Report Metadata
  lines.push(row(['WhereDidItGo Financial Analytics Report']))
  lines.push(row(['Generated', new Date().toISOString()]))
  lines.push(row(['Period', period]))
  lines.push(row(['Date Range', rangeLabel]))
  lines.push(row(['Start Date', range.start ?? 'All Time']))
  lines.push(row(['End Date', range.end]))
  lines.push(row(['Currency', currency]))
  lines.push('')

  const summary = summarizeRange(transactions, range)

  // 2. Executive Metrics Summary
  lines.push(row(['--- EXECUTIVE FINANCIAL KPIS ---']))
  lines.push(row(['Metric', 'Value', 'Details / Prior Period']))
  lines.push(row(['Total Inflow', (summary.income / 100).toFixed(2), currency]))
  lines.push(row(['Total Outflow', (summary.expense / 100).toFixed(2), currency]))
  lines.push(row(['Net Savings', (summary.net / 100).toFixed(2), currency]))
  lines.push(row(['Savings Rate', `${kpis.savingsRate.pct}%`, kpis.savingsRate.tone]))
  lines.push(
    row([
      'Daily Burn Rate (Current)',
      (kpis.dailyBurn.currentDaily / 100).toFixed(2),
      kpis.dailyBurn.deltaPct != null
        ? `${kpis.dailyBurn.deltaPct > 0 ? '+' : ''}${kpis.dailyBurn.deltaPct}% vs prior period`
        : 'N/A',
    ]),
  )
  if (kpis.dailyBurn.priorDaily > 0) {
    lines.push(
      row([
        'Daily Burn Rate (Prior)',
        (kpis.dailyBurn.priorDaily / 100).toFixed(2),
        currency,
      ]),
    )
  }
  lines.push(
    row([
      'Projected Period-End Spend',
      (kpis.projectedSpend.projectedAmount / 100).toFixed(2),
      `${kpis.projectedSpend.daysRemaining} days remaining`,
    ]),
  )
  lines.push(
    row([
      'Essential Spending',
      `${kpis.essentialRatio.essentialPct}%`,
      `${(kpis.essentialRatio.essentialAmount / 100).toFixed(2)} ${currency}`,
    ]),
  )
  lines.push(
    row([
      'Discretionary Spending',
      `${kpis.essentialRatio.discretionaryPct}%`,
      `${(kpis.essentialRatio.discretionaryAmount / 100).toFixed(2)} ${currency}`,
    ]),
  )
  lines.push('')

  // 3. Category & Subcategory Spend Distribution
  lines.push(row(['--- CATEGORY BREAKDOWN ---']))
  lines.push(row(['Category', 'Subcategory', 'Amount', 'Share (%)', 'Tx Count']))
  const totalOutflow = summary.expense || 1
  for (const cat of detailedCategories) {
    const catPercent = Math.round(cat.percent)
    lines.push(
      row([
        cat.name,
        '(All)',
        (cat.amount / 100).toFixed(2),
        `${catPercent}%`,
        cat.txCount,
      ]),
    )
    for (const sub of cat.subcategories) {
      const subPercent = Math.round((sub.amount / totalOutflow) * 100)
      lines.push(
        row([
          cat.name,
          sub.name,
          (sub.amount / 100).toFixed(2),
          `${subPercent}%`,
          sub.txCount,
        ]),
      )
    }
  }
  lines.push('')

  // 4. Filtered Transactions Ledger
  lines.push(row(['--- TRANSACTIONS LEDGER ---']))
  lines.push(row(['Date', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'To Account', 'Note']))

  const filteredTx = transactions
    .filter((tx) => isInRange(tx.date, range.start, range.end))
    .sort((a, b) => b.date.localeCompare(a.date))

  for (const tx of filteredTx) {
    lines.push(
      row([
        tx.date,
        tx.type,
        (tx.amount / 100).toFixed(2),
        tx.categoryId ? catMap[tx.categoryId] ?? '' : '',
        tx.subcategoryId ? subMap[tx.subcategoryId] ?? '' : '',
        accMap[tx.accountId] ?? '',
        tx.toAccountId ? accMap[tx.toAccountId] ?? '' : '',
        tx.note ?? '',
      ]),
    )
  }

  // Prepend UTF-8 BOM so spreadsheet apps (Excel, Numbers) open Cyrillic/non-ASCII cleanly
  return '\ufeff' + lines.join('\r\n')
}

/**
 * Exports the generated analytics report to a CSV file.
 * Uses Capacitor Share on native mobile platforms and standard Blob download on web.
 */
export async function exportAnalyticsReport(opts: AnalyticsReportOptions): Promise<string> {
  const csv = generateAnalyticsReportCsv(opts)
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
  const filename = `wherediditgo-analytics-${opts.period}-${timestamp}.csv`

  if (isNative()) {
    await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const uri = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
    try {
      await Share.share({
        title: `WhereDidItGo Report (${opts.rangeLabel})`,
        url: uri.uri,
        dialogTitle: 'Export Analytics Report',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel')) {
        throw err
      }
    }
    return filename
  }

  // Web fallback: download via object URL
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return filename
}
