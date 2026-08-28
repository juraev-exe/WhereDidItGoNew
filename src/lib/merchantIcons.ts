/**
 * Merchant name → icon name, matched against a transaction's note text.
 * Lets a recognized merchant (e.g. "Netflix") show a more specific icon than
 * its category default, without bundling an external brand-icon library —
 * the app is offline-first, so every icon here already ships via IconByName.
 */
const MERCHANT_ICONS: Record<string, string> = {
  netflix: 'tv',
  'youtube premium': 'clapperboard',
  youtube: 'clapperboard',
  spotify: 'music',
  'apple music': 'music',
  'apple tv': 'tv',
  hbo: 'tv',
  disney: 'tv',
  uber: 'car',
  lyft: 'car',
  bolt: 'car',
  airbnb: 'home',
  booking: 'plane',
  starbucks: 'coffee',
  mcdonalds: 'utensils',
  "mcdonald's": 'utensils',
  kfc: 'utensils',
  amazon: 'shopping-bag',
  aliexpress: 'shopping-bag',
  ebay: 'shopping-bag',
  apple: 'smartphone',
  google: 'cloud',
  microsoft: 'laptop',
  steam: 'gamepad-2',
  playstation: 'gamepad-2',
  xbox: 'gamepad-2',
  gym: 'dumbbell',
  fitness: 'dumbbell',
}

const ENTRIES = Object.entries(MERCHANT_ICONS).sort((a, b) => b[0].length - a[0].length)

/** Returns an icon name for a known merchant mentioned in `note`, or null. */
export function iconForMerchant(note: string): string | null {
  const text = note.trim().toLowerCase()
  if (!text) return null
  for (const [merchant, icon] of ENTRIES) {
    if (text.includes(merchant)) return icon
  }
  return null
}
