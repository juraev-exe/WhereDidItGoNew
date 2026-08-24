/** Curated Lucide icon names available for categories */
export const CATEGORY_ICONS = [
  // Food & Drinks
  'utensils',
  'coffee',
  'beer',
  'pizza',
  'apple',
  'cake',
  'glass-water',
  'wine',
  'sandwich',
  'cookie',

  // Transportation & Travel
  'car',
  'bus',
  'fuel',
  'plane',
  'bike',
  'train',
  'ship',
  'navigation',
  'compass',
  'map-pin',
  'ticket',
  'luggage',

  // Shopping & Retail
  'shopping-bag',
  'shopping-cart',
  'shirt',
  'store',
  'package',
  'scissors',
  'watch',
  'gem',
  'footprints',
  'tag',

  // Health, Fitness & Beauty
  'heart-pulse',
  'stethoscope',
  'pill',
  'dumbbell',
  'activity',
  'sparkles',
  'cross',
  'syringe',
  'brain',

  // Entertainment & Hobbies
  'clapperboard',
  'music',
  'gamepad-2',
  'tv',
  'film',
  'camera',
  'headphones',
  'mic',
  'palette',

  // Housing, Utilities & Services
  'home',
  'building-2',
  'receipt',
  'zap',
  'droplets',
  'wifi',
  'smartphone',
  'wrench',
  'hammer',
  'plug',
  'key',
  'shield-check',

  // Work & Education
  'graduation-cap',
  'book-open',
  'briefcase',
  'laptop',
  'calculator',
  'pen-tool',
  'file-text',
  'folder',
  'award',
  'target',

  // Finance & Investments
  'banknote',
  'wallet',
  'piggy-bank',
  'credit-card',
  'landmark',
  'trending-up',
  'trending-down',
  'dollar-sign',
  'coins',
  'vault',
  'chart-pie',
  'hand-coins',

  // Family, Pets & Life
  'baby',
  'paw-print',
  'gift',
  'heart',
  'users',
  'user',

  // Nature & Outings
  'palmtree',
  'tent',
  'tree-pine',
  'flower-2',
  'umbrella',
  'cloud',

  // Basic
  'repeat',
  'plus-circle',
  'circle-ellipsis',
  'circle',
] as const

export type CategoryIconName = (typeof CATEGORY_ICONS)[number]
