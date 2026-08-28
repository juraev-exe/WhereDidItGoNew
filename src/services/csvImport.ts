import { format } from 'date-fns'
import { parse } from 'papaparse'
import { createId } from '@/lib/id'
import { nowISO } from '@/lib/dates'
import { parseMoneyToMinor } from '@/lib/money'
import type { Transaction, TransactionType } from '@/types/finance'

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
}

/**
 * Parse raw CSV text (from a bank export) into a header row and data rows.
 * Uses papaparse rather than a naive `split(',')` — real exports quote fields
 * that contain commas, newlines or the delimiter itself.
 */
export function parseCsv(text: string): CsvParseResult {
  // Leading BOM (common on Windows/Excel exports) would otherwise stick to the
  // first header name.
  const stripped = text.replace(/^﻿/, '')
  const result = parse<string[]>(stripped, {
    skipEmptyLines: true,
  })
  const data = result.data.filter((row) => row.length > 0)
  if (!data.length) return { headers: [], rows: [] }
  const [headers, ...rows] = data
  return { headers: headers ?? [], rows }
}

export type CsvAmountMode = 'single' | 'splitDebitCredit'

export interface CsvColumnMapping {
  dateColumn: number | null
  descriptionColumn: number | null
  amountMode: CsvAmountMode
  /** Used when amountMode === 'single'. Sign determines expense vs income. */
  amountColumn: number | null
  /** Used when amountMode === 'splitDebitCredit'. */
  debitColumn: number | null
  creditColumn: number | null
}

export function emptyMapping(): CsvColumnMapping {
  return {
    dateColumn: null,
    descriptionColumn: null,
    amountMode: 'single',
    amountColumn: null,
    debitColumn: null,
    creditColumn: null,
  }
}

const HEADER_HINTS = {
  date: /date|posted|transaction date/i,
  description: /desc|narrat|memo|payee|merchant|details/i,
  amount: /amount|amt|value/i,
  debit: /debit|withdrawal|out(going)?|money out/i,
  credit: /credit|deposit|in(coming)?|money in/i,
}

/** Best-effort guess at which CSV column is which, from header names alone. */
export function guessMapping(headers: string[]): CsvColumnMapping {
  const find = (re: RegExp) => headers.findIndex((h) => re.test(h))
  const debitColumn = find(HEADER_HINTS.debit)
  const creditColumn = find(HEADER_HINTS.credit)
  const hasSplit = debitColumn !== -1 && creditColumn !== -1
  return {
    dateColumn: valueOrNull(find(HEADER_HINTS.date)),
    descriptionColumn: valueOrNull(find(HEADER_HINTS.description)),
    amountMode: hasSplit ? 'splitDebitCredit' : 'single',
    amountColumn: hasSplit ? null : valueOrNull(find(HEADER_HINTS.amount)),
    debitColumn: hasSplit ? debitColumn : null,
    creditColumn: hasSplit ? creditColumn : null,
  }
}

function valueOrNull(index: number): number | null {
  return index === -1 ? null : index
}

function cell(row: string[], index: number | null): string {
  if (index == null) return ''
  return (row[index] ?? '').trim()
}

/** Turns `y`, `m`, `d` into a `yyyy-MM-dd` string only if they form a real calendar date. */
function toIsoIfValid(year: number, month: number, day: number): string | null {
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parse a bank CSV date cell into the `yyyy-MM-dd` format `Transaction.date` uses
 * elsewhere. Bank exports vary a lot, so this tries the common shapes in turn:
 * ISO, `yyyy/MM/dd`, dot-separated day-first (common in RU/EU exports), then
 * slash/dash-separated where day-vs-month is inferred from which value is >12.
 */
export function parseCsvDateToIso(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return toIsoIfValid(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const isoSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (isoSlash) return toIsoIfValid(Number(isoSlash[1]), Number(isoSlash[2]), Number(isoSlash[3]))

  const dot = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dot) return toIsoIfValid(Number(dot[3]), Number(dot[2]), Number(dot[1]))

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const a = Number(slash[1])
    const b = Number(slash[2])
    const month = a > 12 ? b : a
    const day = a > 12 ? a : b
    return toIsoIfValid(Number(slash[3]), month, day)
  }

  const dash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dash) {
    const a = Number(dash[1])
    const b = Number(dash[2])
    const month = a > 12 ? b : a
    const day = a > 12 ? a : b
    return toIsoIfValid(Number(dash[3]), month, day)
  }

  // Last resort for things like "Jan 15, 2024".
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd')

  return null
}

/**
 * Normalizes a raw amount cell (currency symbols, thousands separators,
 * accounting-style parentheses for negatives) into a plain decimal string
 * that `parseMoneyToMinor` can convert, so we don't reinvent that conversion.
 */
function normalizeAmountString(raw: string): string {
  let s = raw.trim()
  if (!s) return ''

  const paren = s.match(/^\((.*)\)$/)
  const negative = Boolean(paren)
  if (paren) s = paren[1]!

  // Strip everything but digits, separators and sign.
  s = s.replace(/[^0-9,.\-+]/g, '')
  if (!s) return ''

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator appears last is the decimal point; the other is thousands grouping.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    const parts = s.split(',')
    const looksLikeThousands = parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3)
    s = looksLikeThousands ? parts.join('') : s.replace(',', '.')
  }

  return negative && !s.startsWith('-') ? `-${s}` : s
}

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

/** Returns minor units (can be negative), or null if the cell isn't a parseable amount. */
export function parseCsvAmountToMinor(raw: string): number | null {
  const normalized = normalizeAmountString(raw)
  if (!normalized || !PLAIN_NUMBER.test(normalized)) return null
  return parseMoneyToMinor(normalized)
}

export type CsvSkipReason =
  | 'invalidDate'
  | 'invalidAmount'
  | 'zeroAmount'
  | 'ambiguousDebitCredit'
  | 'noAccount'

export interface CsvSkippedRow {
  /** 1-based row number as the user would count it in a spreadsheet (data rows only). */
  rowNumber: number
  reason: CsvSkipReason
}

export interface CsvImportBuildResult {
  transactions: Transaction[]
  skipped: CsvSkippedRow[]
}

/**
 * Turns mapped CSV rows into ready-to-insert Transactions. Every row lands as
 * an uncategorized expense or income (never transfer) — the amount's sign (or
 * which of debit/credit is filled) decides the type. Rows that can't be
 * parsed are collected with a reason rather than dropped silently.
 */
export function buildTransactionsFromCsv(
  rows: string[][],
  mapping: CsvColumnMapping,
  accountId: string,
): CsvImportBuildResult {
  const transactions: Transaction[] = []
  const skipped: CsvSkippedRow[] = []

  rows.forEach((row, i) => {
    const rowNumber = i + 1
    if (row.every((c) => !c || !c.trim())) return // fully blank line, not a real row

    if (!accountId) {
      skipped.push({ rowNumber, reason: 'noAccount' })
      return
    }

    const isoDate = parseCsvDateToIso(cell(row, mapping.dateColumn))
    if (!isoDate) {
      skipped.push({ rowNumber, reason: 'invalidDate' })
      return
    }

    const description = cell(row, mapping.descriptionColumn)

    let type: TransactionType
    let amountMinor: number

    if (mapping.amountMode === 'splitDebitCredit') {
      const debitRaw = cell(row, mapping.debitColumn)
      const creditRaw = cell(row, mapping.creditColumn)
      const debit = debitRaw ? parseCsvAmountToMinor(debitRaw) : null
      const credit = creditRaw ? parseCsvAmountToMinor(creditRaw) : null
      if ((debitRaw && debit == null) || (creditRaw && credit == null)) {
        skipped.push({ rowNumber, reason: 'invalidAmount' })
        return
      }
      const hasDebit = Boolean(debit)
      const hasCredit = Boolean(credit)
      if (hasDebit && hasCredit) {
        skipped.push({ rowNumber, reason: 'ambiguousDebitCredit' })
        return
      }
      if (!hasDebit && !hasCredit) {
        // Either both cells were blank/unparseable, or both parsed to exactly 0.
        skipped.push({ rowNumber, reason: debitRaw || creditRaw ? 'zeroAmount' : 'invalidAmount' })
        return
      }
      type = hasDebit ? 'expense' : 'income'
      amountMinor = Math.abs((hasDebit ? debit : credit)!)
    } else {
      const amount = parseCsvAmountToMinor(cell(row, mapping.amountColumn))
      if (amount == null) {
        skipped.push({ rowNumber, reason: 'invalidAmount' })
        return
      }
      if (amount === 0) {
        skipped.push({ rowNumber, reason: 'zeroAmount' })
        return
      }
      type = amount < 0 ? 'expense' : 'income'
      amountMinor = Math.abs(amount)
    }

    const now = nowISO()
    transactions.push({
      id: createId('tx'),
      type,
      amount: Math.round(amountMinor),
      accountId,
      note: description,
      date: isoDate,
      createdAt: now,
      updatedAt: now,
    })
  })

  return { transactions, skipped }
}
