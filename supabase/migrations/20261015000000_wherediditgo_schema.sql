-- WhereDidItGo: Supabase PostgreSQL Schema with Row Level Security (RLS)
-- Enables multi-device hybrid cloud sync and cloud backup vault.

-- 1. Accounts Table
create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  balance bigint not null default 0,
  currency text not null default 'USD',
  color text not null default '#0d9488',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  icon text not null default 'tag',
  color text not null default '#0d9488',
  sort_order int not null default 0,
  subcategories jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Budgets Table
create table if not exists public.budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  month text not null,
  limit_amount bigint not null default 0,
  rollover boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Goals Table
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount bigint not null default 0,
  current_amount bigint not null default 0,
  deadline text,
  color text not null default '#0d9488',
  icon text not null default 'target',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Transactions Table
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount bigint not null default 0,
  account_id text not null,
  to_account_id text,
  category_id text,
  subcategory_id text,
  note text default '',
  date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Recurring Transactions Table
create table if not exists public.recurring (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null default 0,
  account_id text not null,
  category_id text not null,
  note text default '',
  day_of_month int not null default 1,
  last_posted_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Debts Table
create table if not exists public.debts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lent', 'borrowed')),
  person_name text not null,
  amount bigint not null default 0,
  paid_amount bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'settled')),
  due_date text,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Cloud Snapshot Backups Table (Full snapshot vaults)
create table if not exists public.cloud_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null default 2,
  payload jsonb not null,
  client_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring enable row level security;
alter table public.debts enable row level security;
alter table public.cloud_backups enable row level security;

-- Create Policies for Accounts
drop policy if exists "accounts_user_policy" on public.accounts;
create policy "accounts_user_policy" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Categories
drop policy if exists "categories_user_policy" on public.categories;
create policy "categories_user_policy" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Budgets
drop policy if exists "budgets_user_policy" on public.budgets;
create policy "budgets_user_policy" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Goals
drop policy if exists "goals_user_policy" on public.goals;
create policy "goals_user_policy" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Transactions
drop policy if exists "transactions_user_policy" on public.transactions;
create policy "transactions_user_policy" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Recurring
drop policy if exists "recurring_user_policy" on public.recurring;
create policy "recurring_user_policy" on public.recurring
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Debts
drop policy if exists "debts_user_policy" on public.debts;
create policy "debts_user_policy" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Policies for Cloud Backups
drop policy if exists "cloud_backups_user_policy" on public.cloud_backups;
create policy "cloud_backups_user_policy" on public.cloud_backups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Performance Indexes
create index if not exists idx_accounts_user on public.accounts(user_id, updated_at);
create index if not exists idx_categories_user on public.categories(user_id, updated_at);
create index if not exists idx_budgets_user on public.budgets(user_id, updated_at);
create index if not exists idx_goals_user on public.goals(user_id, updated_at);
create index if not exists idx_transactions_user on public.transactions(user_id, date, updated_at);
create index if not exists idx_recurring_user on public.recurring(user_id, updated_at);
create index if not exists idx_debts_user on public.debts(user_id, updated_at);
create index if not exists idx_cloud_backups_user on public.cloud_backups(user_id, created_at desc);
