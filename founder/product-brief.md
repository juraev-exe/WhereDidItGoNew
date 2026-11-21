<!-- /founder:product-brief · 2026-11-17 · input: WhereDidItGo: local-first expense tracker with offline OCR, multi-currency, and optional encrypted cloud sync -->
# Product brief: WhereDidItGo

## 1. Executive summary
WhereDidItGo is a local-first personal finance application that records transactions instantly without requiring account creation or internet access. The product pairs fast on-device IndexedDB storage with client-side receipt scanning and optional encrypted cloud synchronization.

## 2. Problem statement
Existing personal finance applications suffer from three friction points:
1. Mandatory account creation and privacy exposure: Most budgeting tools demand immediate email signups, phone numbers, or bank account credentials.
2. Cloud latency and offline failure: Web-heavy budgeting applications lag during entry and fail completely in airplanes, subways, or areas with poor mobile reception.
3. Complex setup: Heavy zero-based budgeting platforms require hours of rule configuration before logging an expense.

## 3. Proposed solution
WhereDidItGo removes all onboarding gates. A user opens the app and logs an expense within three seconds.
- Local-first architecture: All data writes to on-device storage first. Transactions persist across restarts without a remote server.
- On-device receipt scanning: An integrated optical character recognition engine extracts receipt totals locally without uploading image files to external servers.
- Optional cloud vault: Users who require multi-device access can connect an encrypted remote database through Supabase Row Level Security.
- Debt and loan tracking: Dedicated records for borrowed and lent money prevent informal debts from distorting operational spending totals.

## 4. Target market
- Primary: Privacy-conscious individuals and professionals who avoid cloud-only financial services.
- Secondary: Multi-currency users and cross-border workers in multilingual regions (English, Russian, Tajik).

## 5. Scope boundaries
- In scope: Manual transaction entry, category budgets, receipt camera capture, multi-account tracking, debt management, JSON/CSV export, optional cloud backup.
- Out of scope: Direct open-banking API scraping, automated bank credential storage, investment portfolio tracking.\n