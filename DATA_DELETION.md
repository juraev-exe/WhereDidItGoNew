# Data Deletion Instructions for WhereDidItGo

**Effective Date**: November 13, 2026  
**Developer**: WhereDidItGo (Juraev.exe) — support@wherediditgo.app  
**Website**: https://juraev-exe.github.io/WhereDidItGoNew/  

WhereDidItGo provides both immediate self-service deletion for on-device records and email-verified deletion for users who opt into Cloud Vault synchronization, in compliance with Google Play User Data policies, Apple App Store guidelines, GDPR Article 17 ("Right to Erasure"), and the CCPA.

## Instant Self-Service Local Deletion and App Uninstallation

Because WhereDidItGo stores your financial ledger locally in IndexedDB by default, you can erase all on-device data immediately without waiting for support approval. Open WhereDidItGo, tap the **Settings** tab, scroll to **Danger Zone**, tap **Reset all local data**, and confirm the prompt. Confirming the reset permanently deletes all accounts, transactions, split items, categories, budgets, debts, savings goals, and local preferences from your device's IndexedDB database.

Uninstalling WhereDidItGo from Android, iOS, or your desktop operating system also removes the application's sandboxed storage directory and all locally stored financial tables.

## Deleting Optional Cloud Vault Accounts and Support Records

Cloud Vault synchronization via Supabase is strictly opt-in. If you registered a Cloud Vault account and want your Supabase user record and all synced database rows (`accounts`, `categories`, `budgets`, `goals`, `debts`, `recurring`, and `transactions`) permanently deleted, sign out under **Settings -> Cloud Vault** and send an email from your registered address to `support@wherediditgo.app` with the subject line **`Cloud Vault Account Deletion`**. We delete your Supabase authentication account and all associated cloud rows within 30 calendar days (and typically within 48 hours).

To erase past support email threads, send a request to `support@wherediditgo.app` with the subject line **`Data Deletion Request`**, and we will purge those messages within 30 calendar days. Purchase receipts and tax invoices processed by Google Play, the Apple App Store, or Stripe / RevenueCat Web Billing are retained by those payment processors under applicable tax and financial record laws.
