---
name: founder
description: Master navigation and coordinator for the Emotix Founder startup skills suite. Covers idea validation, competitor benchmarking, pricing strategy, MVP scoping, user discovery, GTM, pitch decks, and fundraising.
---

# Founder Skills Suite (by Emotix)

A strategic toolkit for startup founders and product builders to handle non-code venture decisions, discovery, and growth.

## Core Rules & Architecture

1. **Persistent State in `founder/`**:
   - `founder/facts.md`: Contains verified facts about the venture, business model, metrics, and founder. Only verified founder statements are stored here (never guesses).
   - `founder/<skill-name>.md`: Output of each specialized skill (e.g. `founder/competitor-matrix.md`, `founder/pricing-strategy.md`).
   - Downstream skills automatically read existing files in `founder/` to preserve context across turns and sessions.

2. **No Fluff & No Hallucinations**:
   - Plain words. Numbers beat adjectives.
   - Banned buzzwords: *delve, leverage, utilize, robust, seamless, cutting-edge, game-changer, unlock, empower, elevate, supercharge, revolutionize*.
   - No em dashes or en dashes.
   - External claims (competitor pricing, market size, benchmarks) must have sources.
   - Missing internal numbers must stay bracketed placeholders (e.g. `[Current monthly churn %]`).

## Available Founder Skills

### 1. Customer Discovery & Validation
- **`founder-validate-idea`**: 7-dimension scorecard (problem severity, market size, willingness to pay, competitor gap, distribution, timing, founder fit) with an uncompromising build / pivot / kill verdict.
- **`founder-product-brief`**: Converts a 1-sentence idea into a clear product spec and feature boundaries.
- **`founder-competitor-matrix`**: Benchmarks 5-8 direct/indirect competitors, feature matrices, and positioning whitespace.
- **`founder-persona-gen`**: Generates 3 prioritized ICP customer personas.
- **`founder-user-interviews`**: Creates a *Mom Test*-compliant discovery interview script and analysis rubric.

### 2. Strategy & Product Launch
- **`founder-mvp-scope`**: Triage features into Must-Have, Should-Have, and Won't-Have buckets.
- **`founder-pricing-strategy`**: Evaluates 6 monetization models, designs 3 tiers, validates unit economics, and applies pricing psychology.
- **`founder-go-to-market`**: 90-day multi-channel roadmap (pre-launch audience building, launch day distribution, activation loops).
- **`founder-landing-page`**: High-converting section-by-section sales copy.
- **`founder-email-sequence`**: Onboarding, activation, and retention email flows.

### 3. Fundraising & Metrics
- **`founder-pitch-deck`**: 12-slide investor narrative structure.
- **`founder-fundraise-prep`**: Investor CRM targeting matrix and 12-week roadshow playbook.
- **`founder-metrics-dashboard`**: Stage-appropriate North Star and secondary KPI setup.
- **`founder-status`**: Reads the entire `founder/` state and reports overall venture standing and next priorities.
