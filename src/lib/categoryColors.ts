/** Modern curated category color palette (Material 3 Expressive) */
export const CATEGORY_COLORS = [
  { hex: '#e07a5f', name: 'Coral' },
  { hex: '#3d5a80', name: 'Ocean Blue' },
  { hex: '#81b29a', name: 'Sage Green' },
  { hex: '#f2cc8f', name: 'Warm Amber' },
  { hex: '#9b5de5', name: 'Royal Purple' },
  { hex: '#ef476f', name: 'Rose Red' },
  { hex: '#118ab2', name: 'Deep Teal' },
  { hex: '#073b4c', name: 'Midnight' },
  { hex: '#2a9d8f', name: 'Emerald' },
  { hex: '#e9c46a', name: 'Gold' },
  { hex: '#f4a261', name: 'Sunset Orange' },
  { hex: '#e76f51', name: 'Terracotta' },
  { hex: '#6b5b95', name: 'Violet' },
  { hex: '#feb236', name: 'Sunburst' },
  { hex: '#d64161', name: 'Crimson' },
  { hex: '#00b4d8', name: 'Sky Cyan' },
  { hex: '#6c757d', name: 'Slate Gray' },
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]['hex']
