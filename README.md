# AIRA — AI Reach Agent

> One prompt. Full campaign. Built for the Xeno Engineering Internship 2026.

Type a plain-English goal. AIRA parses it, segments your customers, generates three message variants with Llama 3.3, recommends a channel, launches, and shows you live delivery analytics — all in under 30 seconds.

**Live demo:** [aira-ecru.vercel.app](https://aira-ecru.vercel.app)

---

## What It Does

- **Natural language campaign goals** — no dropdowns, no SQL, no filters. Just describe what you want.
- **RFM segmentation** — regex-based NLP parser extracts intent, inactive days, and tier keywords from your goal and builds a precise customer filter in under a millisecond.
- **Groq + Llama 3.3 70B** — live AI inference for agent reasoning, three message variants per campaign, and per-customer witty observations on import.
- **Three-layer name sanitizer** — model prompt rule + source data removal + output regex, so `{{first_name}}` is never replaced with a real customer name.
- **Async delivery simulation** — separate channel service fires webhook callbacks per customer (sent → delivered → opened → clicked) with realistic delays and a 5% failure rate.
- **Live analytics polling** — frontend polls `/api/campaigns/[id]` every 2.5 seconds. Analytics recompute from scratch on every callback, never from a stale counter.
- **Campaign history drawer** — every campaign this session, always visible, never buried.
- **Quick Start datasets** — three pre-built fictional brands (Code & Chai Collective, pet brand, gym brand) with realistic personas, spending patterns, and preferred channels.
- **Guided tour** — spotlight-based walkthrough for first-time users.
- **Build War Logs** — 35 real bugs documented in the sidebar.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Browser — React / Next.js               │
│                                                      │
│  AppPhase FSM · Live Poll (2.5s) · History Drawer   │
│  Variant Cards · Guided Tour · Campaign Goal Input   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│           Next.js API Routes (app/api/)              │
│                                                      │
│  POST /api/run              ← goal → full campaign   │
│  POST /api/campaigns/[id]/approve ← launch campaign  │
│  GET  /api/campaigns/[id]   ← live analytics poll    │
│  POST /api/receipts         ← webhook receiver       │
│  POST /api/import           ← seed / paste customers │
└────────┬──────────────────────────┬─────────────────┘
         │                          │
┌────────▼────────┐      ┌──────────▼──────────────────┐
│  lib/agent.ts   │      │     lib/store.ts             │
│                 │      │  globalThis.__aira_store__   │
│  NLP parser     │      │                              │
│  Segment builder│      │  customers[]                 │
│  Groq caller    │      │  orders[]                    │
│  Name sanitizer │      │  campaigns[]                 │
│  Fallback logic │      │  communications[]            │
└────────┬────────┘      └──────────────────────────────┘
         │
┌────────▼────────────────────────────────────────────┐
│                    Groq API                          │
│              Llama 3.3 · 70B Versatile               │
│                                                      │
│  Agent reasoning · Message variants · Observations   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           channel-service/  (separate process)       │
│                   Express · Port 3001                │
│                                                      │
│  POST /send                                          │
│  ├── Acknowledge instantly  { success: true }        │
│  ├── Simulate per-customer delay (1–5s)              │
│  ├── Cascade: delivered → opened (60%) → clicked (40%)│
│  └── Fire POST /api/receipts per customer            │
└─────────────────────────────────────────────────────┘
```

---

## Campaign Flow

```
User types goal
      │
      ▼
POST /api/run
      │
      ├── parseGoal()        — extract intent, days, tier keywords via regex
      ├── buildSegmentConfig() — build customer filter predicate from goal
      ├── customers.filter()  — run predicate against full store
      ├── callGroqLLM()      — generate 3 message variants
      ├── sanitizeVariants() — strip any real names the model injected
      └── return Campaign { status: "pending_approval" }
      │
      ▼
User reviews audience + variants + channel recommendation
      │
      ▼
POST /api/campaigns/[id]/approve
      │
      ├── POST channel-service/send  — dispatch full customer list
      │         └── returns { success: true } immediately
      │
      ▼
channel-service fires async callbacks → POST /api/receipts
      │
      ├── updateCommunicationStatus()
      ├── recount all comms from scratch (not increment)
      └── updateCampaign() with fresh analytics
      │
      ▼
Frontend polls GET /api/campaigns/[id] every 2.5s
      │
      ▼
Live analytics panel updates
```

---

## Folder Structure

```
aira/
├── app/
│   ├── page.tsx                      # Main app — FSM, polling, all UI
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── run/route.ts              # POST — agent reasoning + Groq
│       ├── campaigns/
│       │   ├── route.ts              # GET — list all campaigns
│       │   └── [id]/
│       │       ├── route.ts          # GET — live analytics poll
│       │       └── approve/route.ts  # POST — launch + dispatch
│       ├── receipts/route.ts         # POST — webhook receiver
│       └── import/route.ts           # POST — seed / paste import
│
├── lib/
│   ├── agent.ts                      # NLP parser, segment builder, Groq caller, sanitizer
│   ├── store.ts                      # globalThis singleton — 4 arrays
│   ├── types.ts                      # All TypeScript domain types
│   ├── seed.ts                       # Default seed data
│   ├── demoDatasets.ts               # 3 pre-built brand datasets
│   ├── campaign-suggestions.ts       # Example goal chips
│   └── utils.ts                      # cn(), formatINR(), formatPct()
│
├── components/
│   ├── BusinessOnboardingPortal.tsx  # Import UI — paste, generate, quick start
│   ├── TopCustomerSpotlight.tsx      # Top customer card + next button
│   ├── GuidedDemoSystem.tsx          # Spotlight tour
│   ├── CallbackTerminal.tsx          # Live delivery event log
│   ├── TelemetryDashboard.tsx        # Analytics panel
│   ├── DevWarLogs.tsx                # Build war logs sidebar
│   └── AiraShowcaseSections.tsx      # About, roadmap, limitations, footer
│
├── channel-service/
│   ├── index.js                      # Express server — async delivery simulation
│   └── package.json
│
└── public/
    └── architecture.svg              # Architecture diagram
```

---

## Key Engineering Decisions

| Decision | What | Why |
|----------|------|-----|
| **Separate channel service** | Express server on port 3001 | Mirrors real gateway pattern — Twilio, WhatsApp API acknowledge first, deliver async |
| **In-memory store** | `globalThis.__aira_store__` singleton | Zero setup, ships fast. Swap to Postgres is one file change |
| **Full recount on every callback** | `allComms.filter()` not `counter++` | Out-of-order callbacks self-correct. Stale counters don't |
| **Regex NLP parser** | `parseGoal()` before Groq | Intent extraction in <1ms, no LLM cost, deterministic |
| **Three-layer name sanitizer** | Prompt rule + context removal + regex | Belt and suspenders — model still injects names sometimes |
| **Groq + Llama 3.3 70B** | Free tier, 14k req/day | Fast, free, genuinely capable. Fallback deterministic logic if rate-limited |
| **2.5s polling** | `setInterval` on `/api/campaigns/[id]` | Simpler than SSE for demo scope, visible enough for live feel |
| **No auth** | None | Judges need immediate access. Explicit tradeoff, not an oversight |

---

## Running Locally

**CRM (main app):**
```bash
npm install
npm run dev
# → http://localhost:3000
```

**Channel service (separate terminal):**
```bash
cd channel-service
npm install
node index.js
# → http://localhost:3001
```

**Environment variables:**
```
GROQ_API_KEY=your_key_here
CHANNEL_SERVICE_URL=http://localhost:3001
```

Get a free Groq key at [console.groq.com](https://console.groq.com). The app falls back to deterministic reasoning if no key is provided — all features still work.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| AI | Groq API — Llama 3.3 70B Versatile |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Channel service | Express.js |
| Storage | In-memory singleton |
| Deployment | Vercel |

---

## Links

- **Frontend:** [aira-ecru.vercel.app](https://aira-ecru.vercel.app)
- **Backend (channel service):** [github.com/ayerahh/AIRA-AI-Reach-Agent/tree/main/channel-service](https://github.com/ayerahh/AIRA-AI-Reach-Agent/tree/main/channel-service)
- **Architecture diagram:** [aira-ecru.vercel.app/architecture.svg](https://aira-ecru.vercel.app/architecture.svg)

---

*Built by Aira K. Salish · SRMIST · Xeno Engineering Internship 2026 · 72 hours*
