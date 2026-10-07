import type { Category, TransactionType } from '@/types/finance'
import { todayISO } from '@/lib/dates'

export interface ParsedBankMessage {
  amount: number
  type: TransactionType
  note: string
  date: string
  rawText: string
  rawSender?: string
  confidence: number
  matchedKeyword?: string
}

const EXPENSE_TRIGGERS = [
  /spisanie/i,
  /pokupka/i,
  /oplata/i,
  /platezh/i,
  /purchase/i,
  /spent/i,
  /charged/i,
  /debit/i,
  /payment/i,
  /paid/i,
  /списание/i,
  /покупка/i,
  /оплата/i,
  /плат[её]ж/i,
  /харид/i,
  /пардохт/i,
]

const INCOME_TRIGGERS = [
  /popolnenie/i,
  /postuplenie/i,
  /zachislenie/i,
  /credited/i,
  /received/i,
  /refund/i,
  /deposit/i,
  /salary/i,
  /пополнение/i,
  /поступление/i,
  /зачисление/i,
  /доход/i,
  /даромад/i,
]

/**
 * Keyword-to-category associations for automatic category discovery.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: [
    'auchan',
    'ашан',
    'paykar',
    'пайкар',
    'korzinka',
    'корзинка',
    'market',
    'маркет',
    'supermarket',
    'grocery',
    'продукты',
    'store',
    'spar',
    'magnit',
    'магнит',
    'pyaterochka',
    'пятерочка',
    'perekrestok',
    'перекресток',
    'whole foods',
    'trader joe',
  ],
  dining: [
    'cafe',
    'кафе',
    'restaurant',
    'ресторан',
    'coffee',
    'кофе',
    'starbucks',
    'mcdonald',
    'burger king',
    'kfc',
    'pizza',
    'пицца',
    'sushi',
    'суши',
    'bar',
    'бар',
    'dodo',
    'додо',
    'lavka',
    'лавка',
    'eats',
    'food',
  ],
  transport: [
    'taxi',
    'такси',
    'yandex go',
    'яндекс',
    'uber',
    'lyft',
    'metro',
    'метро',
    'fuel',
    'petrol',
    'gas',
    'азс',
    'газпром',
    'lukoil',
    'лукойл',
    'parking',
    'парковка',
  ],
  utilities: [
    'tcell',
    'megafon',
    'мегафон',
    'babilon',
    'бабилон',
    'beeline',
    'билайн',
    'telecom',
    'internet',
    'интернет',
    'mobile',
    'комунал',
    'электро',
    'barqi tojik',
  ],
  entertainment: [
    'cinema',
    'кино',
    'netflix',
    'spotify',
    'steam',
    'playstation',
    'xbox',
    'games',
    'theatre',
    'театр',
    'youtube',
    'apple.com/bill',
  ],
  shopping: [
    'wildberries',
    'ozon',
    'озон',
    'amazon',
    'aliexpress',
    'zara',
    'h&m',
    'apparel',
    'mall',
  ],
}

/**
 * Parses a raw SMS or push notification text from a banking institution into
 * structured transaction data.
 */
export function parseBankNotification(
  text: string,
  sender?: string,
): ParsedBankMessage | null {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.trim()
  if (cleaned.length < 5) return null

  // 1. Determine Transaction Type
  let type: TransactionType = 'expense'
  let matchedTrigger = false

  for (const rx of INCOME_TRIGGERS) {
    if (rx.test(cleaned)) {
      type = 'income'
      matchedTrigger = true
      break
    }
  }

  if (!matchedTrigger) {
    for (const rx of EXPENSE_TRIGGERS) {
      if (rx.test(cleaned)) {
        type = 'expense'
        matchedTrigger = true
        break
      }
    }
  }

  // 2. Extract Amount
  // Matches expressions like:
  // - "$45.50", "45.50$", "45,50 TJS", "45 TJS", "1 250.00 RUB", "450р", "450 руб"
  const amountRegexes = [
    // Symbol before number: $12.34, € 50, ₽1000
    /(?:[$€£₽]|TJS|somoni|сомони|руб|RUB)\s*([0-9]+(?:[\s,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
    // Number before symbol or unit: 12.34 $, 50 TJS, 120.00 сомони, 450р
    /([0-9]+(?:[\s,][0-9]{3})*(?:[.,][0-9]{1,2})?)\s*(?:[$€£₽]|TJS|somoni|сомони|руб|RUB|р\.?)/i,
    // Key words followed by amount: "spisanie 50.00", "amount: 15.00", "summa: 100"
    /(?:amount|summa|сумма|маблағ|spisanie|oplata|postuplenie)[:\s]+([0-9]+(?:[\s,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
  ]

  let rawAmountStr: string | null = null
  for (const rx of amountRegexes) {
    const match = rx.exec(cleaned)
    if (match && match[1]) {
      rawAmountStr = match[1]
      break
    }
  }

  // Fallback: search for any plausible monetary decimal in text
  if (!rawAmountStr) {
    const fallbackMatch = /\b([0-9]{1,6}(?:[.,][0-9]{2}))\b/.exec(cleaned)
    if (fallbackMatch && fallbackMatch[1]) {
      rawAmountStr = fallbackMatch[1]
    }
  }

  if (!rawAmountStr) {
    return null
  }

  // Normalize amount string to numeric cents/minor units
  const sanitizedNum = rawAmountStr
    .replaceAll(/\s/g, '')
    .replaceAll(',', '.')
  const floatVal = Number.parseFloat(sanitizedNum)
  if (Number.isNaN(floatVal) || floatVal <= 0) return null

  const minorAmount = Math.round(floatVal * 100)

  // 3. Extract Merchant / Note
  let note = extractMerchant(cleaned)
  if (!note && sender) {
    note = sender
  }
  if (!note) {
    note = type === 'expense' ? 'Bank Card Purchase' : 'Bank Deposit'
  }

  // 4. Determine matching category keyword
  const lowerText = cleaned.toLowerCase()
  let matchedKeyword: string | undefined
  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      matchedKeyword = catKey
      break
    }
  }

  const confidence = matchedTrigger ? (matchedKeyword ? 0.95 : 0.85) : 0.65

  return {
    amount: minorAmount,
    type,
    note,
    date: todayISO(),
    rawText: cleaned,
    rawSender: sender,
    confidence,
    matchedKeyword,
  }
}

/**
 * Attempts to extract the merchant name or place of purchase from the notification.
 */
function extractMerchant(text: string): string {
  // Pattern: 'v "Merchant"', 'at Merchant', 'to Merchant', 'v Merchant'
  const merchantPatterns = [
    /(?:at|to|in|в|дар|\bv\b)\s*["«]([^"»]+)["»]/i,
    /(?:at|to|in|в|дар|\bv\b)\s+([A-Za-zА-Яа-я0-9\s.-]{2,30}?)(?=[.,;]|balans|баланс|karta|карта|$)/i,
    /(?:merchant|mesto|место|magazin|магазин|терминал|termin)[:\s]+["«]?([^"»\r\n.,]+)["»]?/i,
  ]

  for (const pat of merchantPatterns) {
    const match = pat.exec(text)
    if (match && match[1]) {
      const candidate = match[1].trim()
      if (candidate.length > 1 && !/^\d+$/.test(candidate)) {
        return candidate
      }
    }
  }

  // Alternative: first quoted text
  const quoteMatch = /["«]([^"»]{2,35})["»]/.exec(text)
  if (quoteMatch && quoteMatch[1]) {
    return quoteMatch[1].trim()
  }

  return ''
}

/**
 * Finds the most relevant Category from existing user categories.
 */
export function matchCategory(
  parsed: ParsedBankMessage,
  categories: Category[],
): Category | undefined {
  if (!categories || categories.length === 0) return undefined

  const kindCategories = categories.filter((c) => c.kind === parsed.type)
  if (kindCategories.length === 0) return undefined

  // 1. Direct keyword match
  if (parsed.matchedKeyword) {
    const kw = parsed.matchedKeyword.toLowerCase()
    const found = kindCategories.find((c) => {
      const name = c.name.toLowerCase()
      const icon = c.icon.toLowerCase()
      return (
        name.includes(kw) ||
        (kw === 'groceries' && (icon.includes('utensils') || icon.includes('shopping') || name.includes('еда') || name.includes('хӯрок'))) ||
        (kw === 'transport' && (icon.includes('car') || icon.includes('bus') || name.includes('транспорт') || name.includes('такси'))) ||
        (kw === 'dining' && (icon.includes('coffee') || icon.includes('utensils') || name.includes('кафе'))) ||
        (kw === 'utilities' && (icon.includes('receipt') || icon.includes('zap') || name.includes('связь') || name.includes('коммунал'))) ||
        (kw === 'entertainment' && (icon.includes('game') || icon.includes('clapperboard') || name.includes('развлечен')))
      )
    })
    if (found) return found
  }

  // 2. Note substring match in category names
  const noteLower = parsed.note.toLowerCase()
  const nameMatch = kindCategories.find((c) => noteLower.includes(c.name.toLowerCase()))
  if (nameMatch) return nameMatch

  // 3. Fallback: first category of matching kind
  return kindCategories[0]
}
