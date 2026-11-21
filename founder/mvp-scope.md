<!-- /founder:mvp-scope · 2026-11-17 · input: WhereDidItGo v1.1.5 release scope triage -->
# Feature scope triage: WhereDidItGo

## 1. Must-have (v1.1.5 Production State)
- Local-first IndexedDB persistence via Dexie.js
- Fast expense, income, and transfer entry with amount keypad
- Subcategories and category color customizer
- Monthly category budget progress bars
- Debts and loans tracker with partial payment tracking
- Trilingual localization: English, Russian, Tajik
- RevenueCat integration for Play Billing and Web Billing
- AdMob banner, interstitial, and rewarded ad passes
- On-device Receipt OCR scanner
- Optional Supabase Cloud Vault sync with Row Level Security

## 2. Should-have (v1.2 Next Milestone)
- Automated recurring transaction templates
- Multi-currency conversion rate caching for offline travelers
- Custom date range reporting and export filters
- Desktop keyboard shortcuts for Electron build

## 3. Won't-have (Explicitly Excluded)
- Automated Plaid / Open Banking bank account scraping: Protects user privacy and eliminates heavy third-party API subscription costs ($0.30/user/mo).
- Stock portfolio and cryptocurrency investment tracking: Preserves focus as a fast daily cash and budget tracker.
- Social feed or peer-to-peer money transfers: Eliminates regulatory and money transmitter compliance burdens.\n