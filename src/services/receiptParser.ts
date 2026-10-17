import type { Category, TransactionType } from '@/types/finance'
import { todayISO } from '@/lib/dates'
import { matchCategory } from '@/services/smsParser'

export interface ParsedReceipt {
  amount: number // in minor units (cents / dirams / kopecks)
  type: TransactionType
  merchant: string
  date: string // YYYY-MM-DD
  rawText: string
  confidence: number
  suggestedCategoryId?: string
  currency?: string
}

/**
 * Common triggers indicating the final or total amount on a receipt across EN, RU, and TJ.
 */
const TOTAL_TRIGGERS = [
  /(?:^|\s)(?:grand\s+total|total\s+amount|balance\s+due|amount\s+due|net\s+total|total)(?:\s*[:=]?\s*)/i,
  /(?:^|\s)(?:итого\s+к\s+оплате|сумма\s+к\s+оплате|всего\s+к\s+оплате|итого|всего|сумма)(?:\s*[:=]?\s*)/i,
  /(?:^|\s)(?:ҳамагӣ|маблағи\s+умумӣ|ба\s+пардохт|ҷамъ)(?:\s*[:=]?\s*)/i,
]

const SUB_TOTAL_TRIGGERS = [
  /(?:^|\s)(?:sub\s*total|subtotal|промежуточный\s+итог)(?:\s*[:=]?\s*)/i,
]

const EXCLUDED_HEADER_WORDS = [
  'welcome',
  'receipt',
  'tax invoice',
  'sales receipt',
  'customer receipt',
  'order',
  'terminal',
  'cashier',
  'merchant id',
  'kassa',
  'чек',
  'кассовый чек',
  'квитанция',
  'фискальный чек',
  'товарный чек',
  'добро пожаловать',
  'рахмат',
  'ташаккур',
  'хуш омадед',
  'хизматрасонӣ',
]

/**
 * Parse money amount string into integer minor units (e.g., "12.50" -> 1250).
 */
export function parseRawAmountToMinor(amountStr: string): number | null {
  if (!amountStr) return null
  // Clean whitespace and currency symbols
  const cleaned = amountStr
    .replace(/[$\u20AC\u00A3\u20BD\u00A5]/g, '')
    .replace(/(?:tjs|rub|usd|eur|som|сомони|руб|долл)/gi, '')
    .trim()

  // Match 12,345.67 or 12345,67 or 123.45 or 12345
  const match = cleaned.match(/(\d+(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+)/)
  if (!match) return null

  let numStr = match[1]!
    .replace(/\s+/g, '') // strip spaces
  
  // If format is 1.250,50 replace . with nothing and , with .
  if (numStr.includes(',') && numStr.includes('.')) {
    if (numStr.indexOf(',') < numStr.indexOf('.')) {
      numStr = numStr.replace(/,/g, '')
    } else {
      numStr = numStr.replace(/\./g, '').replace(',', '.')
    }
  } else if (numStr.includes(',')) {
    // If comma followed by 1 or 2 digits at end, treat as decimal point
    if (/,\d{1,2}$/.test(numStr)) {
      numStr = numStr.replace(',', '.')
    } else {
      numStr = numStr.replace(/,/g, '')
    }
  }

  const val = parseFloat(numStr)
  if (Number.isNaN(val) || val <= 0) return null
  return Math.round(val * 100)
}

/**
 * Extracts a date from receipt text, returning YYYY-MM-DD or today's date as fallback.
 */
export function extractReceiptDate(text: string): string {
  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  // Pattern 2: (DD/MM/YYYY or MM/DD/YYYY)
  const slashMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/)
  if (slashMatch) {
    const [, a, b, y] = slashMatch
    const numA = parseInt(a!, 10)
    const numB = parseInt(b!, 10)

    let day = numA
    let month = numB

    // If second number > 12, it must be the day, so first number is the month (MM/DD/YYYY)
    if (numB > 12) {
      day = numB
      month = numA
    } else if (numA > 12) {
      // First number > 12, so it's DD/MM/YYYY
      day = numA
      month = numB
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return todayISO()
}

/**
 * Extract clean merchant / vendor name from top lines of receipt.
 */
export function extractMerchantName(lines: string[]): string {
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const raw = lines[i]!.trim()
    if (!raw || raw.length < 3 || raw.length > 50) continue

    const lower = raw.toLowerCase()
    // Skip common headers or date/time strings or receipt numbers
    if (EXCLUDED_HEADER_WORDS.some((word) => lower.includes(word))) continue
    if (/^\d+$/.test(raw)) continue
    if (/\b(?:tel|phone|fax|inn|инн|стн|kassa|чек\s*№|order\s*#)\b/i.test(raw)) continue
    if (/\b\d{1,2}[:.]\d{2}\b/.test(raw) && /\b\d{2,4}\b/.test(raw)) continue

    // Found plausible merchant line
    // Strip trailing punctuation and quotes
    const cleaned = raw.replace(/^["'«“]+|["'»”]+$/g, '').trim()
    if (cleaned.length >= 3) return cleaned
  }
  return 'Store / Merchant'
}

/**
 * Main parser function: parses OCR receipt text into structured transaction fields.
 */
export function parseReceiptText(rawText: string, categories: Category[] = []): ParsedReceipt {
  if (!rawText || !rawText.trim()) {
    return {
      amount: 0,
      type: 'expense',
      merchant: 'Store / Merchant',
      date: todayISO(),
      rawText: '',
      confidence: 0,
    }
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let detectedAmount: number | null = null
  let confidence = 0.5

  // 1. First search for explicit TOTAL line triggers
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    const isTotal = TOTAL_TRIGGERS.some((trig) => trig.test(line))
    if (isTotal) {
      // Find amounts on this line or adjacent next line
      const lineAmount = parseRawAmountToMinor(line.replace(/[A-Za-zА-Яа-яҲҳҶҷҒғӢӣӮӯҚқ]/g, ' '))
      if (lineAmount && lineAmount > 0) {
        detectedAmount = lineAmount
        confidence = 0.95
        break
      }
      if (i + 1 < lines.length) {
        const nextAmount = parseRawAmountToMinor(lines[i + 1]!)
        if (nextAmount && nextAmount > 0) {
          detectedAmount = nextAmount
          confidence = 0.9
          break
        }
      }
    }
  }

  // 2. If no total trigger matched, look for subtotal
  if (!detectedAmount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!
      if (SUB_TOTAL_TRIGGERS.some((trig) => trig.test(line))) {
        const amt = parseRawAmountToMinor(line.replace(/[A-Za-zА-Яа-я]/g, ' '))
        if (amt && amt > 0) {
          detectedAmount = amt
          confidence = 0.75
          break
        }
      }
    }
  }

  // 3. Fallback: Find highest dollar/currency amount found in the bottom half of the receipt
  if (!detectedAmount) {
    let maxAmount = 0
    const startIdx = Math.floor(lines.length * 0.3)
    for (let i = startIdx; i < lines.length; i++) {
      const amt = parseRawAmountToMinor(lines[i]!)
      if (amt && amt > maxAmount && amt < 50000000) { // sanity check < $500,000
        maxAmount = amt
      }
    }
    if (maxAmount > 0) {
      detectedAmount = maxAmount
      confidence = 0.6
    }
  }

  const merchant = extractMerchantName(lines)
  const date = extractReceiptDate(rawText)

  // Auto-categorize based on merchant name using existing smsParser keyword logic
  let suggestedCategoryId: string | undefined
  if (categories.length > 0) {
    const mockMsg = {
      note: merchant,
      rawText: rawText,
      amount: detectedAmount || 0,
      type: 'expense' as TransactionType,
      date,
      confidence,
    }
    const matched = matchCategory(mockMsg, categories)
    if (matched) suggestedCategoryId = matched.id
  }

  return {
    amount: detectedAmount || 0,
    type: 'expense',
    merchant,
    date,
    rawText,
    confidence,
    suggestedCategoryId,
  }
}
