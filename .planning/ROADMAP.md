# Roadmap: WhereDidItGo (WDG) — Advanced Financial Analytics Suite

## Overview

Build out the Advanced Financial Analytics & Interactive Reporting Suite within WhereDidItGo, expanding the Insights tab into a comprehensive personal finance intelligence hub with executive KPIs, cash flow trends, category drill-downs, budget runway tracking, and report exports.

## Phases

- [x] **Phase 1: Executive Financial KPIs & Pacing Engine** — Real-time savings rate, daily burn rate comparison, projected period-end spend, and essential vs discretionary spending ratios.
- [x] **Phase 2: Interactive Cash Flow & Category Distribution Charts** — Inflow vs. outflow comparison with day/week/month aggregation and interactive category/subcategory distribution share with transaction drill-down.
- [ ] **Phase 3: Budget Runway & Burn-Rate Gauge** — Pacing metrics comparing spending velocity against elapsed cycle days to warn of impending budget exhaustion.
- [ ] **Phase 4: Flexible Period Filtering & Reports Export** — Period filters (This Month, Last Month, QTD, YTD, All Time) and CSV/JSON export via native share sheets.

## Phase Details

### Phase 1: Executive Financial KPIs & Pacing Engine
**Goal**: Deliver actionable executive summary metric cards at the top of the Analytics view.
**Depends on**: Existing Dexie transactions and stats services
**Requirements**: KPI-01, KPI-02, KPI-03, KPI-04
**Success Criteria** (what must be TRUE):
  1. User sees Net Savings Rate (`(Income - Expenses) / Income * 100`) with semantic visual health tone.
  2. User sees Average Daily Burn Rate compared against the prior period equivalent.
  3. User sees Projected Period-End Spend calculated from current velocity and remaining days in the cycle.
  4. User sees Essential vs. Discretionary ratio based on category types.
**Plans**: 1 plan

Plans:
- [x] 01-01: Implement executive KPI computation service and reactive card components with i18n support.

### Phase 2: Interactive Cash Flow & Category Distribution Charts
**Goal**: Deliver rich, touch-friendly visual charts for trends and category share.
**Depends on**: Phase 1
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04
**Success Criteria** (what must be TRUE):
  1. User can switch Cash Flow chart views between daily, weekly, and monthly buckets.
  2. User can tap or hover on chart bars/data points to inspect exact dates, inflows, and outflows.
  3. User can view interactive category and subcategory distribution shares.
  4. Tapping a category slice filters the activity view or displays underlying transactions.
**Plans**: 1 plan

Plans:
- [x] 02-01: Build interactive CashFlowChart and CategoryDistributionChart components with touch inspection and drill-down.

### Phase 3: Budget Runway & Burn-Rate Gauge
**Goal**: Help users maintain budget discipline with pacing gauges and exhaustion warnings.
**Depends on**: Phase 1, Phase 2
**Requirements**: RUNWAY-01, RUNWAY-02
**Success Criteria** (what must be TRUE):
  1. User can view a visual Budget Runway gauge indicating spend pace relative to elapsed cycle days.
  2. User receives prominent visual pacing warnings for categories trending towards budget overrun.
**Plans**: 1 plan

Plans:
- [ ] 03-01: Implement budget burn-rate calculations and visual RunwayGauge component.

### Phase 4: Flexible Period Filtering & Reports Export
**Goal**: Enable custom date scoping and one-click financial auditing report downloads.
**Depends on**: Phase 2, Phase 3
**Requirements**: REP-01, REP-02
**Success Criteria** (what must be TRUE):
  1. User can toggle between preset periods: This Month, Last Month, QTD, YTD, 7d, 30d, 90d, All Time.
  2. User can tap "Export Report" to generate and share/save a detailed CSV report of the current view.
**Plans**: 1 plan

Plans:
- [ ] 04-01: Add extended period selector and CSV analytics report generator.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Executive Financial KPIs & Pacing Engine | 1/1 | Complete | 2026-09-29 |
| 2. Interactive Cash Flow & Category Distribution Charts | 1/1 | Complete | 2026-10-01 |
| 3. Budget Runway & Burn-Rate Gauge | 0/1 | Not started | - |
| 4. Flexible Period Filtering & Reports Export | 0/1 | Not started | - |
