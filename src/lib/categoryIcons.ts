/**
 * Curated Lucide icon names offered in the category icon picker — trimmed to the
 * most commonly useful one per concept rather than every near-duplicate, so the
 * picker isn't a 100+-icon wall (e.g. no "apple", "wine", "beer" — "utensils"/
 * "coffee"/"pizza" already cover food broadly). This does NOT affect icons
 * already assigned to existing categories: IconByName.vue's render map is a
 * separate, full superset, so anything saved before this trim keeps rendering
 * correctly — trimming this list only narrows what's offered for new picks.
 * Every icon the default seed categories use (src/db/seed.ts) stays included.
 */
export const CATEGORY_ICONS = [
  // Food & Drinks
  'utensils',
  'coffee',
  'pizza',
  'cake',

  // Transportation & Travel
  'car',
  'fuel',
  'plane',
  'bike',

  // Shopping & Retail
  'shopping-bag',
  'shopping-cart',
  'shirt',

  // Health, Fitness & Beauty
  'heart-pulse',
  'stethoscope',
  'pill',
  'dumbbell',

  // Entertainment & Hobbies
  'clapperboard',
  'music',
  'gamepad-2',
  'tv',

  // Housing, Utilities & Services
  'home',
  'receipt',
  'zap',
  'droplets',
  'wifi',
  'smartphone',

  // Work & Education
  'graduation-cap',
  'book-open',
  'briefcase',
  'laptop',

  // Finance & Investments
  'banknote',
  'wallet',
  'piggy-bank',
  'credit-card',
  'dollar-sign',

  // Family, Pets & Life
  'baby',
  'paw-print',
  'gift',
  'heart',

  // Nature & Outings
  'palmtree',

  // Basic
  'repeat',
  'plus-circle',
  'circle-ellipsis',
  'circle',
] as const

export type CategoryIconName = (typeof CATEGORY_ICONS)[number]
