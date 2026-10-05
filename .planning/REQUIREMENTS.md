# Requirements: WhereDidItGo (WDG)

**Defined:** 2026-09-28
**Core Value:** 100% private, local-first financial tracking with instant offline responsiveness and zero data loss.

## v1 Requirements (Advanced Analytics & Reporting Milestone)

Requirements for the Advanced Analytics & Reporting milestone. Each maps to roadmap phases.

### Executive KPI & Pacing Metrics

- [x] **KPI-01**: User can view Net Savings Rate (`(Income - Expenses) / Income * 100`) with positive/neutral/alert indicator
- [x] **KPI-02**: User can view Average Daily Burn Rate comparing the current active period against the prior period
- [x] **KPI-03**: User can view Projected Period-End Spend based on elapsed days and current spend velocity
- [x] **KPI-04**: User can view Essential vs. Discretionary spending breakdown ratio

### Visualizations & Trend Analysis

- [x] **CHART-01**: User can view an interactive comparative Cash Flow (Income vs. Expense) bar/area chart with selectable day/week/month buckets
- [x] **CHART-02**: User can inspect data points on the chart with touch/hover to view precise dates, inflows, and outflows
- [x] **CHART-03**: User can view an interactive Category & Subcategory distribution share chart with slice selection
- [x] **CHART-04**: User can drill down from a category slice directly into its underlying transactions

### Budget Health & Runway

- [x] **RUNWAY-01**: User can view a Budget Burn & Runway gauge showing whether current spending pace is on-track relative to elapsed calendar/cycle days
- [x] **RUNWAY-02**: User can see warnings for budgets that are on pace to be exceeded before cycle end

### Flexible Period Filtering & Reports Export

- [ ] **REP-01**: User can toggle between preset periods: This Month, Last Month, Quarter-to-Date (QTD), Year-to-Date (YTD), 7d, 30d, 90d, All Time
- [ ] **REP-02**: User can export the currently filtered analytics breakdown directly to a CSV report file via the native share/save sheet

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud-hosted analytics or telemetry | Violates core local-first privacy architecture |
| Plaid/Yodlee bank synchronization | Requires remote servers and third-party credential storage |
| Complex investment / stock portfolio tracking | Dedicated expense and cash budgeting focus for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| KPI-01 | Phase 1 | Complete |
| KPI-02 | Phase 1 | Complete |
| KPI-03 | Phase 1 | Complete |
| KPI-04 | Phase 1 | Complete |
| CHART-01 | Phase 2 | Complete |
| CHART-02 | Phase 2 | Complete |
| CHART-03 | Phase 2 | Complete |
| CHART-04 | Phase 2 | Complete |
| RUNWAY-01 | Phase 3 | Complete |
| RUNWAY-02 | Phase 3 | Complete |
| REP-01 | Phase 4 | Pending |
| REP-02 | Phase 4 | Pending |

**Coverage:**
- Active requirements: 12 total
- Mapped to phases: 12
- Completed: 10
- Pending: 2
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-28*
*Last updated: 2026-09-28 after initial project onboarding*
