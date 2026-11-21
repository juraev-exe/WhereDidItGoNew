<!-- /founder:pricing-strategy · 2026-11-17 · input: WhereDidItGo: Free tier with ads, Pro subscriptions ($1.09/mo, $9.29/yr, $26.97 lifetime) and 24h rewarded ad pass -->
# Pricing strategy: WhereDidItGo

## 1. Monetization model comparison
- Model 1: Mandatory subscription ($5 to $10/mo). High churn in consumer utilities without proprietary live bank data feeds.
- Model 2: Ad-only. Low effective cost-per-mille ($1 to $3 CPM), requiring millions of impressions to sustain development.
- Model 3: Hybrid freemium with hybrid unlock (Chosen). Core utility is free with unobtrusive ads. Power features (unlimited accounts, receipt OCR, encrypted cloud sync) unlock via recurring subscription, lifetime purchase, or 24-hour rewarded video pass.

## 2. Product tiers

| Tier | Price | Account Limits | Monthly Transactions | Key Features | Ads |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | $0 | 2 Accounts | Up to 100 tx / mo | Core expense logging, category budgets, local storage | Banner and interstitial ads |
| **Rewarded Pass** | 1 Rewarded Video | Unlimited for 24h | Unlimited for 24h | Temporary access to Pro features (OCR, Cloud Sync) | Ad-free for 24 hours |
| **Pro Monthly** | $1.09 / month | Unlimited | Unlimited | Receipt OCR, Cloud Vault sync, CSV export, priority features | Zero ads |
| **Pro Annual** | $9.29 / year (~$0.18/wk) | Unlimited | Unlimited | All Pro features, 29% discount vs monthly | Zero ads |
| **Pro Lifetime** | $26.97 one-time | Unlimited | Unlimited | Permanent Pro access across all platforms and updates | Zero ads |

## 3. Unit economics and margin analysis
- Server cost per active free user: $0.00 (All data stored in device IndexedDB).
- Server cost per synced cloud user: ~$0.02 / month (Supabase PostgreSQL row storage and egress).
- Gross margin on Pro subscriptions: > 80% after Google Play 15% fee and infrastructure costs.
- Rewarded video ad revenue: Provides monetization for non-paying users in lower purchasing-power regions without frustrating paywalls.

## 4. Pricing psychology tactics
- High lifetime anchor: The $26.97 lifetime option anchors perceived value, making the $9.29 annual tier feel inexpensive ($0.77 per month).
- Paywall triggers: Trigger paywalls naturally when a user attempts to add a third account or exceed 100 monthly transactions, ensuring users first experience the value of the product.\n