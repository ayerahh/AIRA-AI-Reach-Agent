# AIRA — AI Reach Agent

> AI-native mini CRM built for the **Xeno Engineering Take-Home Assignment**.
> Turn a plain-English campaign goal into a targeted, launched, and measured campaign in under 30 seconds.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js App Router)              │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐  │
│   │                    app/page.tsx (Client)                   │  │
│   │                                                            │  │
│   │  [1] Goal Input → "Re-engage lapsed customers…"           │  │
│   │         │                                                  │  │
│   │  [2] Agent Thinking Panel (animated step-by-step UI)      │  │
│   │         │                                                  │  │
│   │  [3] Review: Audience + Message Variants + Channel        │  │
│   │         │                                                  │  │
│   │  [4] Approve → Launch → Analytics Results                 │  │
│   └───────────────────┬───────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │  HTTP (fetch)
          ┌─────────────▼──────────────┐
          │     Next.js Route Handlers  │
          │                            │
          │  POST /api/agent/run       │  ← Batch 2
          │  POST /api/campaigns/launch│  ← Batch 2
          │  GET  /api/campaigns       │  ← Batch 2
          │  GET  /api/customers       │  ← Batch 2
          └──────┬──────────┬──────────┘
                 │          │
   ┌─────────────▼───┐  ┌───▼──────────────────────┐
   │   Agent Service  │  │   Channel Service         │
   │  lib/agent.ts    │  │   lib/channel-service.ts  │
   │                  │  │                           │
   │ • Parse goal     │  │ • Route by channel        │
   │ • Score segments │  │ • Simulate delivery       │
   │ • Draft messages │  │ • Return comm records     │
   │ • Pick channel   │  └───────────┬───────────────┘
   └──────┬───────────┘              │
          │                          │
   ┌──────▼──────────────────────────▼──────────────┐
   │                  lib/store.ts                   │
   │           (In-Memory Singleton Store)            │
   │                                                  │
   │   customers[]   orders[]   campaigns[]           │
   │   communications[]                               │
   └──────────────────────────────────────────────────┘
          │
   ┌──────▼──────────────┐
   │    lib/seed.ts       │
   │  25 customers        │
   │  ~100 orders         │
   │  (Velour brand data) │
   └──────────────────────┘
```

---

## Core Flow (5 Steps)

```
Goal Input
    │
    ▼
POST /api/agent/run
    │
    ├── Parse goal (fake LLM → real LLM swap point)
    ├── Analyse customers in store
    ├── Build AudienceSegment (RFM + tag filters)
    ├── Draft 3 MessageVariants
    ├── Select optimal CampaignChannel
    └── Return Campaign { status: "pending_approval" }
    │
    ▼
UI Review (Audience / Variants / Channel)
    │
    ▼
POST /api/campaigns/launch
    │
    ├── Update campaign status → "launching"
    ├── Call Channel Service per customer
    │       └── Simulate: queued → sent → delivered → opened/clicked
    ├── Create Communication records in store
    ├── Compute CampaignAnalytics
    └── Return { campaign, analytics }
    │
    ▼
Analytics Results Panel
```

---

## Folder Structure

```
aira/
├── app/
│   ├── layout.tsx              # Root layout + fonts
│   ├── globals.css             # Tailwind + custom animations
│   ├── page.tsx                # Main page (Goal → Agent → Launch → Analytics)
│   └── api/
│       ├── agent/
│       │   └── run/route.ts    # POST: run agent reasoning
│       ├── campaigns/
│       │   ├── route.ts        # GET: list campaigns
│       │   └── launch/route.ts # POST: launch + channel dispatch
│       └── customers/
│           └── route.ts        # GET: customer list (debug/future)
│
├── lib/
│   ├── types.ts                # All TypeScript domain types
│   ├── seed.ts                 # 25 customers + 100 orders
│   ├── store.ts                # In-memory singleton store
│   ├── agent.ts                # Agent reasoning engine (fake → LLM)
│   ├── channel-service.ts      # Channel dispatch simulation
│   ├── analytics.ts            # Analytics computation
│   └── utils.ts                # cn(), formatINR(), makeId(), etc.
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Swapping Fake AI → Real LLM

`lib/agent.ts` exports a single async function `runAgent(goalText, customers, orders)`.
To plug in a real LLM:

```typescript
// Current (fake):
const reasoning = buildFakeReasoning(goalText, segment);

// Replace with:
const reasoning = await callClaudeAPI(goalText, customerSummary);
// or
const reasoning = await callOpenAI(goalText, customerSummary);
```

The function signature and return type stay identical — the rest of the app is unaffected.

---

## Running Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | File-based routing, server actions, edge-ready |
| Language | TypeScript | End-to-end type safety |
| Styling | Tailwind CSS | Utility-first, demo-speed |
| Icons | lucide-react | Consistent, tree-shakeable |
| Dates | date-fns | Lightweight date manipulation |
| State | React useState + server route handlers | No Redux overhead for demo scope |
| Storage | In-memory (Node.js module singleton) | Zero setup, swap-ready for Supabase/Prisma |

---

## Design Decisions

- **Route handlers over Server Actions** — consistent pattern, easier to test with `curl`, clear separation of concerns.
- **Channel Service as a separate `lib/` module** — simulates microservice boundary. In production this would be a separate service called over HTTP.
- **Fake reasoning first** — `lib/agent.ts` uses deterministic logic so the demo never fails. The LLM integration point is a single function call.
- **In-memory store** — `lib/store.ts` is a Node.js singleton that survives hot-reload in dev. Swapping to a DB is a one-file change.

---

*Built for Xeno · 2.5-day sprint · AIRA v0.1*
