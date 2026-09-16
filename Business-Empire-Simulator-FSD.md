# Business Empire Simulator — Functional Specification Document (FSD)

## 1. Document Control

| Field | Value |
|---|---|
| Document | Functional Specification Document — Business Empire Simulator |
| Version | 1.0 (Draft for Implementation) |
| Status | Ready for module-by-module build |
| Intended audience | Engineering (Cursor/AI-assisted implementation), QA, Product |
| Source | Derived from "Master Prompt — Business Empire Simulator" |
| Change policy | Any change to schemas, formulas, or API contracts requires a version bump and changelog entry below |

**Changelog**
- v1.0 — Initial FSD generated from master prompt. No prior versions.

---

## 2. Executive Summary

Business Empire Simulator (BES) is a browser-based, single-player business strategy game. Players found and grow a company inside one of six industries (Software House, AI Company, Real Estate, Furniture Manufacturing, Bank, Tourism) across a 100-level campaign. Every decision updates a persistent, server-authoritative company state; consequences can be immediate, probabilistic, or delayed by dozens of levels. The system is architected as a **data-driven simulation engine** (industry content is configuration, not code) sitting behind a stateless REST API, with MongoDB as the system of record and all randomness and scoring resolved server-side to prevent manipulation.

This FSD is the single source of truth for implementation. It fixes the domain model, the six core engines (Simulation, Decision, Financial, Event, Market, Scoring), the database schema, the API contract, and the security/concurrency model. Where the master prompt left a choice open, a **Design Decision** is recorded inline rather than left TBD.

---

## 3. Product Vision

Give players an economically honest "flight simulator" for entrepreneurship: growth is possible, but every lever (hiring, pricing, debt, quality, reputation) has a realistic trade-off, and short-term wins can create long-fuse consequences. The game should teach cash-flow discipline, risk management, and strategic patience through play, not through quizzes.

## 4. Product Objectives

- OBJ-1: Deliver a replayable 50–100 level campaign per industry with materially different mechanics per industry (not re-skins).
- OBJ-2: Make outcomes server-authoritative, auditable, and cheat-resistant.
- OBJ-3: Support save/resume with zero progress loss, including mid-decision network failure.
- OBJ-4: Ship an MVP (Software House, ~30 levels) that proves the full engine pipeline end-to-end.
- OBJ-5: Keep the architecture industry-agnostic so Release 2/3 industries require content, not engine rewrites.

## 5. Scope

In scope for this FSD: full domain model and engine design for all six industries; MVP implementation plan for Software House; complete schema, API, security, and content-architecture specification sufficient to build incrementally toward the full 100-level, six-industry product.

## 6. Out of Scope

- Multiplayer, PvP, or shared-economy features.
- Real-money transactions or payments.
- Native mobile apps (web responsive only).
- Localization/i18n (English only for v1).
- Social/viral features (leaderboards are a Phase-3+ candidate, not committed here).

## 7. Stakeholders

Product Owner, Game Designer, Solution Architect, Backend Engineers, Frontend Engineers, QA/Balancing Analyst, DevOps.

## 8. Personas

- **The Strategist** — plays cautiously, optimizes cash flow, wants to see *why* an outcome happened.
- **The Gambler** — takes big swings (large contracts, debt, aggressive hiring), wants high variance and comeback mechanics.
- **The Completionist** — wants to play every industry, unlock every achievement, read the Founder Report in full.

## 9. Assumptions

- A9.1: Single active game per (user, industry, save-slot); multiple saves per user are allowed (see GAME-FR-002).
- A9.2: Sessions are web-only; no offline play — all decisions round-trip to the server.
- A9.3: Real-time multiplayer market interaction is not required; "competitors" are simulated NPCs driven by the Market Engine.

## 10. Constraints

- C10.1: Stack fixed to HTML5/CSS3/vanilla JS ES6+ (client), Node.js + Express (server), MongoDB (persistence), JWT auth, bcrypt password hashing — per master prompt §22.
- C10.2: Browser must never compute financial outcomes or randomness (master prompt §25, §32).
- C10.3: No single MongoDB document may hold a player's full 100-level history (master prompt §26).

---

## 11. Complete User Journey

1. Visitor lands → Sign Up (email + password) or Login.
2. Post-login → "My Businesses" screen: Continue / Start New / Completed / Failed.
3. New game wizard: Select Industry → Select Difficulty → Enter Company Name + Founder Name → Review starting conditions → **Start Business**.
4. Dashboard loads current state + current Situation (event/decision card).
5. Player selects a decision option → client sends decision request → server resolves via the Simulation Engine pipeline (§34) → animated consequence reveal ("Cash $420,000 → $365,000 ↓") → dashboard updates.
6. Some consequences are flagged "3 MONTHS LATER…" and resolve automatically as pending consequences mature (§35).
7. Player can inspect History, Projects, Employees, Market, Achievements at any time without affecting state.
8. On failure condition → Game Over screen with recovery options if eligible (§14/§38), else Founder Report.
9. On reaching Level 100 (or earlier terminal state) → cinematic End Game summary + Founder Report (§16, §39).

---

## 12. Authentication Requirements

| ID | Requirement |
|---|---|
| AUTH-FR-001 | Register with email + password. Email must be unique, RFC-5322 valid. Password ≥ 8 chars, hashed with bcrypt (cost factor 12). |
| AUTH-FR-002 | Login issues a short-lived JWT access token (15 min) + refresh token (7 days, httpOnly cookie). |
| AUTH-FR-003 | Logout invalidates the refresh token (server-side deny-list keyed by token id). |
| AUTH-FR-004 | Forgot Password issues a single-use, time-limited (30 min) reset token, emailed as a link; token stored hashed (not plaintext) in DB. |
| AUTH-FR-005 | Reset Password consumes the token exactly once (atomic `findOneAndUpdate` with token match + expiry check) and invalidates all existing refresh tokens for that user. |
| AUTH-FR-006 | All `/api/games/*` routes require a valid access token; middleware attaches `req.userId`. |

**Design Decision:** JWT access tokens are stateless and short-lived; refresh tokens are the only revocable artifact, stored hashed in a `refreshTokens` collection keyed by `userId`, to keep logout/security-invalidation possible without a full session store.

---

## 13. Game Creation Requirements

| ID | Requirement |
|---|---|
| GAME-FR-001 | Player selects one of six industries; selection loads that industry's `industryConfig` (§27). |
| GAME-FR-002 | Player selects difficulty: Easy / Normal / Hard / Expert. Difficulty is immutable after creation (Design Decision: changing difficulty mid-game would invalidate balancing and historical probabilities). |
| GAME-FR-003 | Player supplies Company Name (2–60 chars) and Founder Name (2–60 chars); both are sanitized (strip HTML) server-side. |
| GAME-FR-004 | Server computes starting state = `industryConfig.startingState` × `difficultyModifiers`, and returns it for confirmation before creation is finalized. |
| GAME-FR-005 | On confirmation, server creates `games` + initial `gameStates` (version 1) documents atomically (single-document inserts are atomic in MongoDB; game and its first state are written in that order with the game marked `initializing` until the state write succeeds, then flipped to `active`). |

**Example starting state (Software House, Normal):**
```json
{
  "cash": 100000,
  "revenue": 0,
  "monthlyExpenses": 8000,
  "reputation": 10,
  "employees": 3,
  "customers": 0,
  "debt": 0,
  "operationalCapacity": 100,
  "quality": 70,
  "level": 1
}
```

---

## 14. Save/Resume Requirements

| ID | Requirement |
|---|---|
| SAVE-FR-001 | Every processed decision persists a new `gameStates` document (or version-incremented update) before the response is returned to the client — "save" and "decision processing" are the same transaction, not a separate step. |
| SAVE-FR-002 | Continue Game loads the latest `gameStates` document by `gameId` plus the current unresolved event (if any) and renders exactly where the player left off. |
| SAVE-FR-003 | If a decision request is interrupted client-side (browser closed mid-request), the server has already committed the state change; on reload the client simply fetches current state — no player-visible loss is possible because the client never held authoritative state. |
| SAVE-FR-004 | Idempotency: repeated submission of the same `idempotencyKey` returns the previously computed result rather than reprocessing (§24). |

---

## 15. Industry System

Each industry is defined by an `industryConfig` object (§27) that supplies starting state, KPIs, revenue/cost models, roles, event pools, and level progression — the engines are generic and industry-agnostic; only content differs. This is the mechanism that satisfies "must not simply reskin the same game" (master prompt §2): each `industryConfig` encodes a **different revenue model, different core loop bottleneck, and different failure conditions**, summarized below and detailed in §43.

| Industry | Core Bottleneck | Primary Revenue Driver | Signature Risk |
|---|---|---|---|
| Software House | Delivery capacity vs. sales pipeline | Project contracts | Technical debt / delivery failure |
| AI Company | Compute cost vs. model quality | Funding rounds + API/enterprise revenue | Model failure / competitor leapfrog |
| Real Estate | Cash tied up in inventory | Unit sales / rent | Interest rate & construction delay |
| Furniture Manufacturing | Production capacity vs. demand | Wholesale/export orders | Defect rate / logistics failure |
| Bank | Capital adequacy & liquidity | Interest income (loans − deposits cost) | Non-performing loans / regulatory shutdown |
| Tourism | Seasonal demand volatility | Package bookings | Cancellations / partner failure |

---

## 16. Level System

- Levels are grouped into 7 phases (§13 of master prompt): Survival (1–10), Early Growth (11–25), Expansion (26–40), Professionalization (41–55), Market Competition (56–70), Major Corporation (71–85), Empire (86–100).
- Each phase unlocks new mechanics (e.g., debt/investors from Phase 2, departments from Phase 3, M&A offers from Phase 5+).
- Levels are **not** 1:1 hard-coded events. A level advance triggers the Event Engine to select from an eligible pool for the current phase (§36).
- Design Decision: "Level" = number of **decisions resolved**, not elapsed real time or in-game months, so pacing is player-driven. In-game calendar time (`gameMonth`) advances independently via decision-duration effects, and is what delayed consequences (§35) key off of, not level number, except where a consequence explicitly says "at Level N."

---

## 17. Simulation Engine

The Simulation Engine is the orchestrator that runs on every decision submission. See full pipeline and pseudocode in §34.

## 18. Decision Engine

Responsible for computing effects of a single chosen option.

**Effect types (all must be supported per master prompt §6):**
- **Direct effects** — deterministic state deltas (e.g., `cash -= 30000`).
- **Probability-based effects** — an outcome resolved via `successProbability` (§20).
- **Delayed effects** — pushed onto `pendingConsequences` (§35).
- **Conditional effects** — applied only if a predicate over current state is true (e.g., `if capacity > 90: moraleDelta -= 5`).
- **Hidden effects** — applied to state but not shown in the immediate consequence reveal (e.g., `qualityRisk += 25`, revealed only when it later triggers an event).
- **Industry-specific effects** — effect keys defined only in that industry's schema (e.g., `nonPerformingLoans` only exists for Bank).

**Decision document shape (authoring format, stored in `decisions` collection):**
```json
{
  "decisionId": "swh-lvl8-bigclient-A",
  "eventId": "swh-lvl8-bigclient",
  "label": "Accept immediately",
  "directEffects": { "revenuePipeline": 200000 },
  "conditionalEffects": [
    { "if": "operationalCapacity > 85", "then": { "employeeMorale": -10 } }
  ],
  "probabilityEffects": [
    { "key": "deliverySuccess", "baseProbability": 0.65,
      "modifiers": [
        { "source": "reputation", "formula": "reputation * 0.002" },
        { "source": "employeeMorale", "formula": "(employeeMorale-50) * 0.001" },
        { "source": "operationalCapacity", "condition": ">85", "value": -0.15 }
      ],
      "onSuccess": { "reputation": 5, "cash": 200000 },
      "onFailure": { "reputation": -15, "cash": 80000 }
    }
  ],
  "hiddenEffects": { "deliveryRisk": 20 },
  "delayedEffects": [
    { "triggerLevel": "+6", "probability": 0.3, "eventPool": "delivery-strain" }
  ]
}
```

## 19. Event Engine

See §7, §36 for triggering rules and eligibility predicates. Event categories: Opportunity, Crisis, Market, Competitor, Employee, Customer, Financial, Regulatory, Technology, Random, Strategic.

## 20. Financial Engine

Core formulas (all documented with worked examples, per master prompt §11 and §45):

**Operating Profit**
```
operatingProfit = revenue - operatingExpenses
```
*Example:* revenue = $180,000, operatingExpenses = $140,000 → operatingProfit = $40,000.

**Net Profit**
```
netProfit = operatingProfit - interest - taxes - exceptionalLosses
```
*Example:* operatingProfit = $40,000, interest = $2,500, taxes (29%) = $10,875, exceptionalLosses = $0 → netProfit = $26,625.

**Cash Balance**
```
cashBalance(t) = cashBalance(t-1) + cashInflows(t) - cashOutflows(t)
```

**Company Valuation** (simplified multiple-based model, Design Decision — no public market exists in-game so valuation must be formulaic):
```
companyValuation = (annualRevenue * industryRevenueMultiple)
                  + (netProfit * industryProfitMultiple * 3)
                  + (reputation/100 * brandPremiumFactor)
                  - debt
```
*Example (Software House, revenueMultiple=2.2, profitMultiple=6, brandPremiumFactor=$500,000):*
annualRevenue=$2,160,000, netProfit=$319,500, reputation=70, debt=$150,000
→ valuation = (2,160,000×2.2) + (319,500×6×3) + (0.70×500,000) − 150,000
→ valuation = 4,752,000 + 5,751,000 + 350,000 − 150,000 = **$10,703,000**

**Success Probability with modifiers** (master prompt §5):
```
finalProbability = clamp(baseProbability + Σ(modifiers), 0.05, 0.95)
```
*Example:* base 70%, reputation +5%, employee quality +8%, high workload −15%, strong management +7% → 70+5+8−15+7 = 75% → clamp → **75%**. Clamping to [5%, 95%] is a Design Decision so no outcome is ever fully certain or impossible (preserves replayability per §37).

**Diminishing returns on scale** (master prompt §37 — management overhead):
```
managementOverheadFactor = 1 + max(0, (employees - 20)) * 0.004   // capped at 1.6
effectiveOutputPerEmployee = baseOutputPerEmployee / managementOverheadFactor
```
*Example:* 100 employees → overhead factor = 1 + 80×0.004 = 1.32 → each employee's effective output is divided by 1.32, so 100 employees ≠ 10× the output of 10 employees (which has factor 1.0).

## 21. Workforce Engine

Employees are **aggregated by role** once headcount exceeds a per-industry threshold (default 25) — per master prompt §10 ("do not simulate hundreds of individuals"). Below the threshold, employees may be tracked as light-weight sub-documents; above it, only role-level aggregates (`count`, `avgSkill`, `avgMorale`, `avgProductivity`) are kept. Design Decision: the switch is transparent to the player — the UI always shows role aggregates, so no behavior changes at the threshold, only internal storage shape.

## 22. Project Engine

Project lifecycle state machine: `Opportunity → Negotiation → Won → In Progress → (Delayed) → Completed | Failed | Cancelled`. Transitions are triggered by decisions and by scheduled/probabilistic events (e.g., a Delayed project has a recurring probability each level of becoming Completed or escalating to Failed).

## 23. Market Engine

Maintains global `marketStates` (per game, since each playthrough's market evolves independently): `marketGrowth`, `inflation`, `interestRate`, `consumerDemand`, `competitionIntensity`, `economicCondition`, `technologyTrend`. These update on a scheduled cadence (every 5 levels, Design Decision, to keep macro shifts perceptible but not noisy) and after major triggered events (e.g., "Economic recession begins" forces `economicCondition = recession` for a random 8–15 level duration).

## 24. Difficulty Engine

Difficulty is a static multiplier set applied once at game creation to `industryConfig.startingState` and to all probability/cost formulas thereafter, per the table in master prompt §12. Stored per-game as `difficultyModifiers` snapshot (not re-read from config later) so future balance patches never retroactively change an in-progress game — **Design Decision** for save-game stability.

## 25. Scoring Engine

```
businessScore =
    financialPerformanceScore * 0.25 +
    growthScore                * 0.15 +
    reputationScore             * 0.15 +
    employeePerformanceScore    * 0.10 +
    marketShareScore            * 0.15 +
    riskManagementScore         * 0.10 +
    strategicDecisionsScore     * 0.10
```
Each sub-score is normalized 0–1000 against industry- and difficulty-specific benchmarks before weighting (Design Decision: raw dollar values aren't comparable across industries, so every sub-score is first percentile-normalized against that industry/difficulty's expected distribution, then weighted).

Founder ratings: 0–199 Failed Founder, 200–399 Survivor, 400–599 Business Operator, 600–749 Successful Entrepreneur, 750–899 Industry Leader, 900–1000 Business Empire.

## 26. Achievement System

Achievements are evaluated as a pure read of post-decision state (never mutate simulation variables — master prompt §18). Stored as a static catalog (`achievements` collection) plus a per-user unlock record (`userAchievements`).

## 27. Failure/Recovery System

Failure states (not just cash=0): Bankruptcy, Unsustainable Debt, Regulatory Shutdown, Reputation Collapse, Customer Collapse, Major Fraud, Liquidity Crisis. Each has a **Critical State** pre-stage (§38) offering recovery decisions (Emergency Loan, Debt Restructuring, Sell Division/Assets, Layoffs, Founder Investment, Strategic Acquisition) before the game is marked `failed`. A successful turnaround is recorded in history and factored into the final score (small positive weight in `riskManagementScore`).

## 28. End Game

At Level 100 (or on any terminal state), the engine evaluates final company state against ending thresholds (Bankrupt, Acquired, Stable Business, National Leader, International Company, Industry Leader, Business Empire) and generates the Founder Report (§16 of master prompt, example in §39 below).

---

## 29. Dashboard Requirements

| ID | Requirement |
|---|---|
| UI-FR-001 | Header shows Company Name, Industry, Level, Difficulty. |
| UI-FR-002 | Primary cards: Cash, Revenue, Profit/Loss, Company Value, Employees, Customers, Reputation — each sourced from `GET /api/games/:gameId/dashboard`, never recomputed client-side. |
| UI-FR-003 | Charts: Revenue Trend, Profit Trend, Cash Flow, Valuation — sourced from `GET /api/games/:gameId/financials` (paginated by period, not full history). |
| UI-FR-004 | Decision resolution shows an animated before→after delta per affected metric, then reveals delayed-effect banners ("3 MONTHS LATER…") when applicable on a subsequent load. |
| UI-FR-005 | Mobile: cards stack vertically, bottom navigation, thumb-friendly (≥44px) decision buttons, no horizontal scroll, animations reduced/disabled under `prefers-reduced-motion`. |

## 30. Business History

`GET /api/games/:gameId/history` returns paginated decision history (level, situation, decision, immediate outcome, financial impact snapshot). Full history is **never** loaded on dashboard boot (master prompt §23) — dashboard reads only current `gameStates` + latest N financial periods.

## 31. Functional Requirements

Represented throughout this document by ID-tagged requirements (AUTH-FR, GAME-FR, SAVE-FR, SIM-FR, DEC-FR, EVT-FR, FIN-FR, EMP-FR, PRJ-FR, MKT-FR, SCORE-FR, UI-FR). Each requirement follows the template in §41 (Requirement IDs) — see Appendix A for the full requirement register (to be maintained in the project tracker, seeded from this document).

**Representative example (full template applied):**

> **SIM-FR-001 — Process a player decision**
> - **Description:** Given a valid pending event and a chosen option, the system resolves all effect types and persists the new state.
> - **Actor:** Authenticated player (game owner).
> - **Preconditions:** Game is `active`; event `status = pending`; submitted `expectedStateVersion` matches current `gameStateVersion`.
> - **Trigger:** `POST /api/games/:gameId/decisions`.
> - **Main Flow:** See §34 pipeline.
> - **Alternative Flow:** Version mismatch → 409 with current state; player must refetch and resubmit.
> - **Business Rules:** Randomness resolved server-side only; all effect types in §18 must be evaluated in the documented order.
> - **Validation:** `decisionId` must belong to the current `eventId`; `idempotencyKey` required.
> - **Postconditions:** New `gameStates` version persisted; `decisionHistory` entry written; achievements/failure conditions evaluated.
> - **Acceptance Criteria:** See §42.

## 32. Non-Functional Requirements

Performance, Security, Concurrency, Mobile/Accessibility — detailed in §33–36 below and §31/§32/§33/§34/§35 of the master prompt.

## 33. Performance Requirements

- API p95 response time < 300ms for decision processing under nominal load.
- Dashboard load performs exactly 1 request for state + 1 for the current event (no N+1 chatter).
- `gameStates` reads are indexed by `gameId` (unique current-state doc) — history is a separate, paginated collection (§26).
- Static assets served with long-lived cache headers + content hashing; gzip/brotli compression enabled at the reverse proxy.

## 34. Security Requirements

Password hashing (bcrypt), JWT validation, per-route authorization (`authenticatedUserId === game.userId` on every game route — master prompt §31), rate limiting (auth endpoints: 10 req/min/IP; decision endpoint: 60 req/min/user), Helmet security headers, strict CORS allow-list, input validation (schema-based, e.g., Joi/Zod) on every route, NoSQL-injection prevention (never interpolate user input into query operators; use parameterized/typed query builders), XSS prevention (sanitize all free-text fields — Company/Founder name — on write), CSRF protection on cookie-based refresh flow (SameSite=Strict + double-submit token), env-var secrets only, request body size limits (100KB default), audit log for auth events and failed authorization attempts.

## 35. Mobile/Responsive Requirements

Breakpoints: 320, 375, 390, 430px, tablet, laptop, desktop. Rules per master prompt §21 (vertical card stacking, resizing charts, bottom nav, thumb-friendly buttons, no horizontal overflow, reduced animation on mobile).

## 36. Accessibility

WCAG 2.1 AA target: color contrast ≥ 4.5:1 on all state-delta indicators (don't rely on red/green alone — pair with ↑/↓ icons, already specified in §20 UI examples), full keyboard navigation for decision cards, ARIA live region for consequence-reveal animations, `prefers-reduced-motion` respected.

---

## 37. MongoDB Schema

**Design Decision on embedding vs. referencing:** current, frequently-read state is embedded/compact (`gameStates` holds only the *current* snapshot); anything append-only and potentially large (decisions, financial periods, triggered events) is a **separate, referenced collection** keyed by `gameId`, so the current-state document stays small and fast regardless of how long a game has run — directly satisfying master prompt §26's "no giant document" constraint.

### 37.1 `users`
```json
{
  "_id": "ObjectId",
  "email": "taimoor@example.com",
  "passwordHash": "bcrypt...",
  "createdAt": "ISODate",
  "lastLoginAt": "ISODate"
}
```
Index: `email` unique.

### 37.2 `games`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "industry": "software-house",
  "difficulty": "normal",
  "companyName": "NovaStack AI",
  "founderName": "Taimoor",
  "status": "active",
  "currentLevel": 8,
  "gameStateVersion": 27,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
Index: `userId + status` (compound — powers the "My Businesses" list filtered by active/completed/failed).

### 37.3 `gameStates` (current snapshot only, one live doc per game)
```json
{
  "_id": "ObjectId",
  "gameId": "ObjectId",
  "version": 27,
  "level": 8,
  "gameMonth": 14,
  "state": {
    "cash": 365000,
    "revenue": 180000,
    "monthlyExpenses": 42000,
    "debt": 30000,
    "companyValue": 1250000,
    "reputation": 62,
    "customers": 9,
    "employees": 14,
    "employeeMorale": 58,
    "operationalCapacity": 91,
    "quality": 74,
    "marketShare": 3.2,
    "brandStrength": 40
  },
  "industryState": { "deliveryRisk": 20, "technicalDebt": 12 },
  "pendingConsequences": [
    { "sourceDecisionId": "swh-lvl8-bigclient-A", "triggerLevel": 14, "probability": 0.3, "eventPool": "delivery-strain" }
  ],
  "currentEvent": { "eventId": "swh-lvl9-hiring-crunch", "status": "pending" }
}
```
Index: `gameId` unique.

### 37.4 `industries` (static content catalog)
```json
{ "_id": "software-house", "industryConfig": { "...": "see §27" } }
```
Index: `_id` (industry key) — primary key lookup.

### 37.5 `levels` (level→phase mapping, per industry)
```json
{ "_id": "software-house#8", "industry": "software-house", "level": 8, "phase": "survival",
  "unlockedMechanics": ["outsourcing"], "eventPoolIds": ["swh-lvl-6to10-crisis", "swh-lvl-6to10-opportunity"] }
```
Index: `industry + level` compound.

### 37.6 `events` (static authoring content)
```json
{ "_id": "swh-lvl8-bigclient", "industry": "software-house", "phaseEligible": ["survival","early-growth"],
  "category": "opportunity", "title": "The Big Client",
  "eligibility": { "reputation": {"gte": 0} },
  "decisionIds": ["swh-lvl8-bigclient-A","swh-lvl8-bigclient-B","swh-lvl8-bigclient-C","swh-lvl8-bigclient-D"] }
```
Index: `industry + phaseEligible + category` compound (drives pool selection, §36).

### 37.7 `decisions` (static authoring content — shape shown in §18)
Index: `eventId`.

### 37.8 `decisionHistory` (append-only, per game)
```json
{ "_id": "ObjectId", "gameId": "ObjectId", "level": 8, "eventId": "swh-lvl8-bigclient",
  "decisionId": "swh-lvl8-bigclient-A", "resolvedAt": "ISODate",
  "immediateOutcome": { "revenue": 200000 }, "financialImpact": { "cashDelta": -30000 },
  "randomResolution": { "key": "deliverySuccess", "finalProbability": 0.75, "roll": 0.42, "result": true },
  "idempotencyKey": "uuid" }
```
Index: `gameId + level` compound (powers paginated history without loading everything). Unique index on `idempotencyKey` (enforces exactly-once processing, §24/§25).

### 37.9 `projects` (per game)
```json
{ "_id": "ObjectId", "gameId": "ObjectId", "projectName": "Retail POS Platform", "client": "Acme Retail",
  "contractValue": 200000, "cost": 140000, "duration": 4, "requiredCapacity": 25, "risk": 0.2,
  "qualityRequirement": 70, "deadline": "gameMonth:18", "paymentTerms": "net-60", "status": "in-progress" }
```
Index: `gameId + status` compound.

### 37.10 `workforce` (per game — aggregated once above threshold, §21)
```json
{ "_id": "ObjectId", "gameId": "ObjectId", "role": "developer", "count": 9,
  "avgSkill": 62, "avgMorale": 58, "avgProductivity": 71, "totalSalary": 63000 }
```
Index: `gameId + role` compound, unique.

### 37.11 `financialHistory` (append-only periods, per game)
```json
{ "_id": "ObjectId", "gameId": "ObjectId", "period": "gameMonth:14",
  "revenue": 180000, "operatingExpenses": 140000, "operatingProfit": 40000,
  "interest": 2500, "taxes": 10875, "netProfit": 26625, "cashBalance": 365000, "companyValuation": 1250000 }
```
Index: `gameId + period` compound (dashboard charts read a bounded window, e.g. last 24 periods, via this index — never the full history).

### 37.12 `marketStates` (per game)
```json
{ "_id": "ObjectId", "gameId": "ObjectId", "asOfLevel": 8,
  "marketGrowth": 4.1, "inflation": 6.2, "interestRate": 11.5, "consumerDemand": 0.9,
  "competitionIntensity": 0.6, "economicCondition": "normal", "technologyTrend": "AI-adoption" }
```
Index: `gameId + asOfLevel` compound.

### 37.13 `achievements` (static catalog) / `userAchievements` (unlocks)
```json
{ "_id": "first-profit", "title": "First Profit", "condition": "netProfit > 0" }
```
```json
{ "_id": "ObjectId", "userId": "ObjectId", "gameId": "ObjectId", "achievementId": "first-profit", "unlockedAt": "ISODate" }
```
Index: `userId + gameId` compound on `userAchievements`.

## 38. Collection Relationships

`users (1) —< games (1) —1 gameStates` (current snapshot), `games (1) —< decisionHistory`, `games (1) —< projects`, `games (1) —< workforce`, `games (1) —< financialHistory`, `games (1) —< marketStates`, `games (1) —< userAchievements`. Static content (`industries`, `levels`, `events`, `decisions`, `achievements`) is referenced by key from game-scoped collections, never duplicated per game.

## 39. Indexing Strategy

Summarized inline per collection in §37.9–37.13 above. General rule: every game-scoped, append-only collection is indexed on `gameId` (+ a secondary field used for pagination/filtering) so no query ever needs a collection scan proportional to total game history.

## 40. Data Retention

Active and completed games retained indefinitely (player-owned history/Founder Reports). Refresh tokens purged on expiry via TTL index. Password reset tokens purged via TTL index (30 min). Failed/abandoned games older than 24 months with `status=failed` are candidates for a cold-storage export job (Phase 3+, not MVP).

---

## 41. API Specifications

All responses: `{ "success": bool, "data": {...} | "error": {...} }`. All game routes require `Authorization: Bearer <accessToken>` and enforce `authenticatedUserId === game.userId`.

### 41.1 Auth
```
POST /api/auth/register        { email, password } → 201 { userId }
POST /api/auth/login           { email, password } → 200 { accessToken } (+ refresh cookie)
POST /api/auth/forgot-password { email } → 200 { message } (always 200 — no email enumeration)
POST /api/auth/reset-password  { token, newPassword } → 200 { message }
```

### 41.2 Games
```
GET  /api/games                       → 200 { games: [...] }               // filter by status query param
POST /api/games                       { industry, difficulty, companyName, founderName } → 201 { game, gameState }
GET  /api/games/:gameId               → 200 { game }
GET  /api/games/:gameId/dashboard     → 200 { state, currentEvent }
GET  /api/games/:gameId/current-event → 200 { event, decisions }
POST /api/games/:gameId/decisions     { eventId, decisionId, expectedStateVersion, idempotencyKey } → 200 { newState, outcome }
GET  /api/games/:gameId/history       ?page=&limit= → 200 { entries, page, hasMore }
GET  /api/games/:gameId/financials    ?limit=24 → 200 { periods }
GET  /api/games/:gameId/projects      → 200 { projects }
GET  /api/games/:gameId/employees     → 200 { workforce }
GET  /api/games/:gameId/achievements  → 200 { unlocked, locked }
POST /api/games/:gameId/restart       → 200 { game, gameState }
```

**Decision request/response example:**
```json
// Request
{
  "eventId": "swh-lvl8-bigclient",
  "decisionId": "swh-lvl8-bigclient-A",
  "expectedStateVersion": 27,
  "idempotencyKey": "3f9c9e2a-..."
}
// Response
{
  "success": true,
  "data": {
    "newState": { "version": 28, "level": 8, "state": { "cash": 365000, "reputation": 67 } },
    "outcome": {
      "immediate": { "cashDelta": -30000, "reputationDelta": 5 },
      "delayed": [{ "label": "Delivery strain risk registered", "triggerLevel": 14 }]
    }
  }
}
```

## 42. Validation Rules

- `expectedStateVersion` must equal current `gameStateVersion` or request is rejected (409).
- `decisionId` must belong to `eventId`, and `eventId` must match the game's `currentEvent.eventId`.
- `idempotencyKey` required on every mutating game route; unique-indexed in `decisionHistory`.
- All free-text fields sanitized and length-capped server-side regardless of client-side validation.

## 43. Error Handling

Standard error envelope: `{ "success": false, "error": { "code": "STALE_STATE_VERSION", "message": "...", "currentState": {...} } }`. Key codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403 — not game owner), `NOT_FOUND` (404), `STALE_STATE_VERSION` (409), `DUPLICATE_IDEMPOTENCY_KEY` (200, returns prior result — not an error to the client), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## 44. Concurrency Strategy

Optimistic concurrency via `gameStateVersion`. Decision processing is a single atomic MongoDB `findOneAndUpdate` with filter `{ gameId, version: expectedStateVersion }` and `$set`/`$inc` update including `version: expectedStateVersion + 1`; a null result means a concurrent write already advanced the version, and the server returns 409 with the fresh state (master prompt §24 worked exactly this way: version 27 → 28, repeat of 27 rejected).

## 45. Idempotency Strategy

Client generates a UUID `idempotencyKey` per decision attempt (stable across retries of the *same* user action). Server writes it as a unique-indexed field on the `decisionHistory` entry inside the same transaction as the state update; on a duplicate key error, server re-reads the existing `decisionHistory` entry for that key and returns its recorded outcome instead of reprocessing — satisfying "double click / network retry / multiple tabs" (master prompt §24).

## 46. Game State Management

Current state lives in exactly one place (`gameStates`, one doc per game, version-controlled). All history is derived/append-only and never mutated. This split is what keeps dashboard loads O(1) regardless of how long a game has been played.

---

## 47. Architecture

Layered architecture per master prompt §28:

```
Presentation (HTML/CSS/vanilla JS)
   ↓ REST/JSON
API Layer (Express routes + controllers — thin, no business logic)
   ↓
Application Layer (GameService, AuthService, SaveGameService, IndustryConfigService)
   ↓
Domain Layer (SimulationEngine, DecisionEngine, FinancialEngine, EventEngine, MarketEngine, ScoringEngine, WorkforceEngine, ProjectEngine, AchievementEngine)
   ↓
Persistence Layer (MongoDB repositories/models)
```
Controllers validate + call one Application-layer service method; all calculation logic lives in the Domain layer only.

## 48. Component Diagram (textual)

```
Client ── HTTP ──> AuthController ──> AuthService ──> users, refreshTokens
Client ── HTTP ──> GameController ──> GameService ──> IndustryConfigService (industries, levels)
                                          │
                                          └──> SimulationEngine
                                                 ├─ EventEngine (events, levels)
                                                 ├─ DecisionEngine (decisions)
                                                 ├─ FinancialEngine
                                                 ├─ WorkforceEngine (workforce)
                                                 ├─ ProjectEngine (projects)
                                                 ├─ MarketEngine (marketStates)
                                                 ├─ AchievementEngine (achievements, userAchievements)
                                                 └─ ScoringEngine
                                          │
                                          └──> SaveGameService ──> gameStates, decisionHistory, financialHistory
```

## 49. Data Flow

Request → auth middleware → controller validation → GameService loads `game` + `gameStates` → SimulationEngine pipeline (§34) computes new state + side documents → SaveGameService persists atomically → response returned with new state + outcome.

## 50. Folder Structure

As specified in master prompt §33, adopted verbatim: `/client` (index.html, /css, /js/{api,components,pages,state,utils}, /assets) and `/server` (server.js, app.js, /config, /controllers, /routes, /middleware, /models, /repositories, /services, `/game-engine/{simulationEngine,decisionEngine,financialEngine,eventEngine,marketEngine,projectEngine,workforceEngine,scoringEngine}.js`, `/game-content/{software-house,ai-company,real-estate,furniture,bank,tourism}`, /validators, /utils, /tests).

**Responsibilities:**
- `/controllers` — parse request, call one service method, shape response. No calculation.
- `/services` — application orchestration (e.g., `GameService.createGame`, `SaveGameService.persistDecision`).
- `/game-engine` — pure domain logic, unit-testable without Express or MongoDB (functions take/return plain state objects).
- `/game-content` — data only (JSON/JS config objects); no engine code lives here.
- `/repositories` — the only layer that talks to MongoDB collections.
- `/models` — Mongoose (or equivalent) schemas + validation.
- `/middleware` — auth, rate limiting, error handling, request logging.

## 51. Logging

Structured JSON logs (request id, userId, gameId, route, latency, outcome). Audit log stream for auth events and authorization failures, retained separately from general application logs.

## 52. Monitoring

Track: decision-processing p50/p95/p99 latency, 409 (stale version) rate, error rate by code, DB connection pool saturation, per-industry/difficulty balancing telemetry (average score distribution, failure rate by level — feeds §63 balancing).

## 53. Testing Strategy

Unit tests for every Domain-layer engine (pure functions, deterministic given a fixed RNG seed), integration tests for full decision-processing round trips (including idempotency/version-conflict paths), simulation-engine regression tests that replay recorded decision sequences and assert final state, load tests for concurrent decision submission on the same game (validates §44), and security tests for authorization boundary (`authenticatedUserId === game.userId`) and injection resistance.

## 54–58. Unit / Integration / Simulation / Load / Security Testing

Covered together above (§53) per engineering convention for this FSD; each engine ships with its own unit-test suite located alongside it in `/tests`, mirroring `/game-engine`.

## 59. Deployment Architecture

Stateless Node/Express instances behind a load balancer, horizontally scalable (no in-memory session state — JWT + MongoDB only), MongoDB replica set for durability, static client assets served via CDN.

## 60. Environment Configuration

`.env`-driven: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_COST`, `CORS_ORIGINS`, `RATE_LIMIT_*`, `SMTP_*` (password reset email). Never committed; validated at boot (fail fast if a required var is missing).

## 61. Backup/Recovery

MongoDB replica set + scheduled snapshots; point-in-time recovery via oplog for the persistence layer. Game data is the crown jewel (player progress) — backup cadence should be at least daily with a tested restore runbook.

## 62. Scaling Strategy

Horizontal scaling of API tier; MongoDB sharding candidate key `gameId`/`userId` if/when volume requires it (not needed at MVP scale). Read-heavy dashboard/history endpoints are natural cache candidates (short-TTL cache keyed by `gameId + version`).

## 63. Game Balancing Strategy

Per master prompt §37: no dominant strategy, no risk-free path to wealth, diminishing returns at scale (§20 formula), scaling expenses, competition intensity coupled to player success (Market Engine raises `competitionIntensity` as player `marketShare` grows). Balancing is content-tunable (probabilities/modifiers live in `decisions`/`events` documents), not code-tunable, so it can be iterated without redeploying the engine.

## 64. Industry Content Framework

Data-driven `industryConfig` object (master prompt §27), detailed with a full worked example in §27 above and per-industry content outlines in §65 below.

## 65. Acceptance Criteria

Given/When/Then format, applied per requirement (template shown in §31; canonical example below, matching master prompt §42):

> **Given** a logged-in player has an active Software House game at Level 15 with cash = $100,000,
> **When** the player selects a valid decision,
> **Then** the server processes the decision exactly once, calculates its financial consequences, persists the updated company state, increments `gameStateVersion`, stores the decision in history, and returns the resulting state to the client.

## 66. Definition of Done

A feature is Done when: requirement has a passing acceptance test, engine logic has unit-test coverage, the endpoint enforces auth/ownership/validation, the change is reflected in this FSD (or a linked delta), and it has been manually verified on the smallest supported mobile breakpoint (320px).

## 67. MVP Scope

Authentication; Game creation; Core Simulation/Decision/Event/Financial engines; Save/Resume; Dashboard; Software House industry with ~30 polished levels/events (Phase 1–2 content: Survival + Early Growth). No achievements or Founder Report animation polish required for MVP — functional correctness first.

## 68. Release 1

Software House full 100-level progression; AI Company industry; Achievement system; advanced/delayed events; Founder Report.

## 69. Release 2

Real Estate; Furniture Manufacturing; Market Engine improvements (richer macro cycles).

## 70. Release 3

Bank; Tourism; advanced balancing pass across all industries; expanded dynamic event pools.

---

# Appendix A — Simulation Engine Pipeline (Pseudocode)

```
function processDecision(userId, gameId, eventId, decisionId, expectedVersion, idempotencyKey):
    game = Games.findOne({ _id: gameId })
    assert game.userId == userId                         // ownership check, always

    existing = DecisionHistory.findOne({ idempotencyKey })
    if existing: return existing.result                    // idempotent replay

    gameState = GameStates.findOne({ gameId })
    assert gameState.version == expectedVersion             // else 409 STALE_STATE_VERSION
    assert gameState.currentEvent.eventId == eventId
    assert gameState.currentEvent.status == "pending"

    decision = Decisions.findOne({ _id: decisionId, eventId })
    industryConfig = Industries.findOne({ _id: game.industry })

    state = clone(gameState.state)

    applyDirectEffects(state, decision.directEffects)
    applyConditionalEffects(state, decision.conditionalEffects)

    randomResolutions = []
    for pe in decision.probabilityEffects:
        finalProb = clamp(pe.baseProbability + sum(evalModifier(m, state) for m in pe.modifiers), 0.05, 0.95)
        roll = serverRNG()                                  // NEVER client-supplied
        success = roll < finalProb
        applyDirectEffects(state, success ? pe.onSuccess : pe.onFailure)
        randomResolutions.append({ key: pe.key, finalProb, roll, success })

    applyHiddenEffects(state, decision.hiddenEffects)        // stored, not shown in immediate outcome

    financials = FinancialEngine.recompute(state, industryConfig)
    state = merge(state, financials)

    for de in decision.delayedEffects:
        pendingConsequences.push(buildPendingConsequence(de, gameState.level))

    newLevel = gameState.level + 1
    maturedConsequences = resolveMaturedConsequences(pendingConsequences, newLevel)
    for mc in maturedConsequences:
        state = EventEngine.applyMaturedConsequence(state, mc)

    nextEvent = EventEngine.selectNextEvent(industryConfig, newLevel, state, game.difficulty)

    failureCheck = evaluateFailureConditions(state, industryConfig)
    if failureCheck.triggered and not failureCheck.recoverable:
        game.status = "failed"
    elif failureCheck.triggered and failureCheck.recoverable:
        nextEvent = buildCriticalStateEvent(failureCheck)

    newAchievements = AchievementEngine.evaluate(state, game)
    score = ScoringEngine.compute(state, game)

    // Single atomic write: version-guarded state update
    result = GameStates.findOneAndUpdate(
        { gameId, version: expectedVersion },
        { $set: { version: expectedVersion + 1, level: newLevel, state, pendingConsequences,
                   currentEvent: { eventId: nextEvent.id, status: "pending" }, score } }
    )
    if result == null: return error("STALE_STATE_VERSION")   // lost the race

    DecisionHistory.insertOne({ gameId, level: gameState.level, eventId, decisionId,
        immediateOutcome, financialImpact, randomResolutions, idempotencyKey, resolvedAt: now() })
    FinancialHistory.insertOne({ gameId, period: newGameMonth, ...financials })
    if newAchievements.length: UserAchievements.insertMany(newAchievements)

    return { newState: result, outcome: { immediate: ..., delayed: maturedConsequences } }
```

This mirrors, in order, the pipeline specified in master prompt §34: validate game → validate event → validate version → load state → load industry rules → direct effects → probability modifiers → resolve random outcome → financial effects → workforce effects → reputation effects → register delayed consequences → evaluate triggerable events → evaluate failure conditions → evaluate achievements → calculate score → persist atomically → return result.

---

# Appendix B — Per-Industry Content Outline (Framework)

Full 20-event, 100-level content packs are an authoring task executed inside `/game-content/<industry>` against the schemas in §37.6–37.7, sequenced per the roadmap in §67–70 (Software House first, per MVP). For each industry, the required content package is:

- Starting state + difficulty modifier table (structure per §13, §24).
- Core KPIs (industry-specific fields added to `industryState`, e.g., `nonPerformingLoans` for Bank, `defectRate` for Furniture, `cancellationRate` for Tourism).
- Revenue and cost model (formulas in the Financial Engine's industry-specific extension point).
- Employee roles (feeds Workforce Engine's role catalog).
- Project/contract types (feeds Project Engine, where applicable — e.g., Bank uses "loan applications" instead of "projects," modeled on the same state machine).
- ≥20 seed events per phase-cluster (Survival/Early Growth first for MVP), tagged with eligibility predicates (§36).
- Major crises, growth milestones, failure conditions, end-game objectives — authored as data, evaluated by the generic Failure/Achievement/End-Game logic already specified above.
- 100-level progression map expressed as phase → unlocked mechanics → event-pool references (per §16), not as 100 hard-coded rows.

This structure is what allows Release 2/3 industries to be pure content work against an unchanged engine — the architectural goal stated in the master prompt's final instruction.
