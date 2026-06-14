"use client";

/**
 * AIRA — AI Reach Agent
 * Main application page.
 *
 * Flow:
 * 1. User types a natural-language campaign goal
 * 2. Client POSTs to /api/agent/run (→ server fakes AI reasoning)
 * 3. Agent thinking panel animates through steps in real-time (SSE-ready,
 * currently polls via optimistic UI with local step progression)
 * 4. Results appear: audience segment, message variants, chosen channel
 * 5. User approves → POST /api/campaigns/launch → analytics surface
 */

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import TelemetryDashboard from "@/components/TelemetryDashboard";
import { GuidedDemoSystem } from "@/components/GuidedDemoSystem";
import BusinessOnboardingPortal from "@/components/BusinessOnboardingPortal";
import TopCustomerSpotlight from "@/components/TopCustomerSpotlight";
import {
  AchievementsSection,
  AboutBuilderSection,
  AIRoadmapSection,
  KnownLimitationsSection,
  MegaFooter,
  AttributionBar,
} from "@/components/AiraShowcaseSections";
import { SEED_SUGGESTIONS, type CampaignSuggestion } from "@/lib/campaign-suggestions";
import {
  Sparkles,
  Brain,
  Users,
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Zap,
  TrendingUp,
  ArrowRight,
  Copy,
  RefreshCw,
  BarChart3,
  Send,
  Phone,
  Mail,
  Bell,
  Terminal as TerminalIcon,
  ChevronDown,
} from "lucide-react";
import { cn, formatINR, formatPct } from "@/lib/utils";
import type {
  Campaign,
  AgentStep,
  MessageVariant,
  CampaignChannel,
  CampaignAnalytics,
} from "@/lib/types";
import CallbackTerminal from "@/components/CallbackTerminal";


// ─── Types ────────────────────────────────────────────────────────────────────

type AppPhase =
  | "idle"          // waiting for goal input
  | "thinking"       // agent running
  | "review"         // agent done, awaiting approval
  | "launching"      // campaign being launched
  | "results";       // analytics shown

// Local step animation — mirrors AgentThinkingStep on the server
const THINKING_STEPS: Omit<AgentStep, "status" | "startedAt" | "completedAt">[] = [
  {
    id: "parsing_goal",
    label: "Parsing campaign goal",
    detail: "Extracting intent, target behaviour, and success criteria from your input…",
  },
  {
    id: "analyzing_customers",
    label: "Analysing customer base",
    detail: "Scanning 250 customers × purchase history, engagement scores, and recency signals…",
  },
  {
    id: "building_segment",
    label: "Building audience segment",
    detail: "Applying RFM filters and behavioural tags to surface the highest-value cohort…",
  },
  {
    id: "drafting_messages",
    label: "Drafting message variants",
    detail: "Generating three channel-specific copy variants with tone and CTA optimisation…",
  },
  {
    id: "selecting_channel",
    label: "Selecting optimal channel",
    detail: "Comparing open-rate priors across Email / SMS / WhatsApp / Push for this segment…",
  },
  {
    id: "finalizing",
    label: "Finalising campaign brief",
    detail: "Packaging audience, message, channel, and confidence score into a launch-ready plan…",
  },
];

// Step durations in ms — intentionally visible for demo effect
const STEP_DURATIONS = [1200, 1800, 1600, 2000, 1400, 1000];

const CHANNEL_ICONS: Record<CampaignChannel, React.ElementType> = {
  email: Mail,
  sms: Phone,
  whatsapp: Send,
  push: Bell,
};

const CHANNEL_COLORS: Record<CampaignChannel, string> = {
  email: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  sms: "text-green-400 bg-green-400/10 border-green-400/20",
  whatsapp: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  push: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

// Example goal prompts for quick-fill
const EXAMPLE_GOALS: { label: string; text: string }[] = [
  { label: "Win-back lapsed customers", text: "Re-engage customers who haven't bought in 90+ days with a personalized discount" },
  { label: "VIP early access", text: "Drive repeat purchases from our Gold-tier members with an exclusive early access offer" },
  { label: "Convert first-timers", text: "Convert first-time buyers into loyal customers by highlighting our loyalty programme" },
  { label: "Platinum win-back", text: "Win back lapsed platinum customers before the end-of-season sale" },
];

interface PipelineChannelCard {
  type: "email" | "whatsapp" | "sms";
  message: string;
  productLabel: string;
}

interface PipelineData {
  dossier: {
    name: string;
    avatar: string;
    location: string;
    ltv: string;
    preferredChannels: string;
    tiers: string[];
    insight: string;
    path: string;
  };
  insights: string[];
  timeline: { label: string; time: string }[];
  channels: PipelineChannelCard[];
  engineStatus: string;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 ml-2 bg-indigo-500/10 rounded-full px-2 py-0.5 border border-indigo-500/20 text-[9px] font-mono text-indigo-400">
      <span className="flex h-1 w-1 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1 w-1 bg-indigo-500"></span>
      </span>
      <span>Reasoning</span>
    </span>
  );
}

function StepIndicator({
  step,
  index,
  currentIndex,
}: {
  step: Omit<AgentStep, "status" | "startedAt" | "completedAt">;
  index: number;
  currentIndex: number;
}) {
  const isDone = index < currentIndex;
  const isActive = index === currentIndex;
  const isPending = index > currentIndex;

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3.5 px-4 rounded-xl transition-all duration-500 border",
        isActive
          ? "bg-indigo-950/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
          : "border-transparent",
        isDone && "opacity-60",
        isPending && "opacity-25"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 border",
          isDone && "bg-emerald-950/40 border-emerald-500/30 text-emerald-400",
          isActive && "bg-indigo-950/80 border-indigo-400/50 text-indigo-300 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.3)]",
          isPending && "bg-slate-950/40 border-slate-900 text-slate-600"
        )}
      >
        {isDone ? (
          <CheckCircle2 size={13} />
        ) : isActive ? (
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold tracking-tight transition-colors font-mono",
              isActive ? "text-indigo-400" : isDone ? "text-slate-300" : "text-slate-500"
            )}
          >
            {step.label}
          </span>
          {isActive && <ThinkingDots />}
        </div>
        {isActive && step.detail && (
          <p className="text-[11px] text-slate-400 mt-1.5 font-sans leading-relaxed animate-fade-in">
            {step.detail}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color = "accent",
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "accent" | "success" | "warning";
  delay?: number;
}) {
  const colorMap = {
    accent: "text-accent-bright",
    success: "text-success",
    warning: "text-warning",
  };
  return (
    <div
      className={cn(
        "glass-panel glass-panel-hover rounded-xl p-5 animate-slide-up relative overflow-hidden group",
        `delay-${delay}`
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      <p className="text-[10px] text-text-muted uppercase tracking-widest font-mono mb-2">
        {label}
      </p>
      <p className={cn("text-3xl font-black tracking-tight", colorMap[color])}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-2 font-mono">{sub}</p>}
    </div>
  );
}

const TONE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  friendly:      { color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20",    dot: "bg-sky-400" },
  urgent:        { color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/20",   dot: "bg-rose-400" },
  exclusive:     { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  dot: "bg-amber-400" },
  informational: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", dot: "bg-violet-400" },
};

function VariantCard({
  variant,
  isChosen,
  onSelect,
}: {
  variant: MessageVariant;
  isChosen: boolean;
  onSelect: () => void;
}) {
  const ChannelIcon = CHANNEL_ICONS[variant.channel];
  const tone = TONE_CONFIG[variant.tone] ?? TONE_CONFIG.informational;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-2xl border transition-all duration-300 relative overflow-hidden group",
        isChosen
          ? "border-purple-500/60 bg-gradient-to-b from-purple-950/30 to-slate-950/60 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/30"
          : "border-slate-800/70 bg-slate-950/50 hover:border-slate-700/70 hover:bg-slate-900/60 hover:shadow-xl hover:-translate-y-0.5"
      )}
    >
      {/* Tone accent bar at top */}
      <div className={cn("h-0.5 w-full", isChosen ? "bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500" : `bg-gradient-to-r from-transparent via-[${tone.dot}]/40 to-transparent`)} />

      {/* Shimmer on hover */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {isChosen ? (
              <div className="w-5 h-5 rounded-full bg-purple-500/30 border border-purple-400/80 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                <CheckCircle2 size={11} className="text-purple-300" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-700 group-hover:border-purple-500/60 flex-shrink-0 transition-colors" />
            )}
            <div>
              <span className="text-sm font-bold text-white tracking-tight block">{variant.label}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", tone.dot)} />
                <span className={cn("text-[10px] font-mono uppercase tracking-wider", tone.color)}>{variant.tone}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={cn("text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono flex items-center gap-1", CHANNEL_COLORS[variant.channel])}>
              <ChannelIcon size={9} />
              {variant.channel}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold tabular-nums">
              {formatPct(variant.predictedCtr)} CTR
            </span>
          </div>
        </div>

        {/* Subject line */}
        {variant.subject && (
          <div className={cn("text-[11px] font-mono px-3 py-2 rounded-lg mb-3 border flex gap-1.5 items-start", tone.bg, tone.border)}>
            <span className="text-slate-500 flex-shrink-0 mt-px">Subject:</span>
            <span className={cn("font-semibold leading-snug", tone.color)}>{variant.subject}</span>
          </div>
        )}

        {/* Body preview */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 font-sans">
          {variant.body}
        </p>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
          {isChosen ? (
            <span className="text-[10px] text-purple-400 font-mono font-bold flex items-center gap-1.5">
              <CheckCircle2 size={11} />
              Selected variant
            </span>
          ) : (
            <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors">
              Click to select
            </span>
          )}
          <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", tone.bg, tone.border, tone.color)}>
            {variant.predictedCtr >= 0.1 ? "Top Pick" : variant.predictedCtr >= 0.08 ? "Strong" : "Solid"}
          </span>
        </div>
      </div>
    </button>
  );
}

function AnalyticsPanel({ analytics }: { analytics: CampaignAnalytics }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Expanded Grid System layout to hold 5 cards alongside each other cleanly */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="Targeted"
          value={analytics.totalTargeted.toString()}
          sub="customers in cohort"
          delay={100}
        />
        <MetricCard
          label="Delivered"
          value={analytics.delivered.toString()}
          sub={formatPct(analytics.deliveryRate) + " success"}
          color="success"
          delay={200}
        />
        <MetricCard
          label="Open Rate"
          value={formatPct(analytics.openRate)}
          sub={`${analytics.opened} views`}
          color="accent"
          delay={300}
        />
        <MetricCard
          label="Clicks"
          value={analytics.clicked.toString()}
          sub={formatPct(analytics.clickRate) + " CTR"}
          color="warning"
          delay={400}
        />
        {/* Requirement TWO: Attributed Orders Card Block */}
        <MetricCard
          label="Attributed Orders"
          value={analytics.ordersCalculated ? analytics.ordersCalculated.toString() : "0"}
          sub="10% click conversion"
          color="success"
          delay={500}
        />
      </div>

      {/* Estimated revenue */}
      <div className="bg-gradient-to-r from-accent/10 to-surface-2 border border-accent/20 rounded-xl p-5 animate-slide-up delay-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
              Estimated Revenue Uplift
            </p>
            <p className="text-3xl font-bold gradient-text">
              {formatINR(analytics.estimatedRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-accent-bright" />
          </div>
        </div>
      </div>

      {/* Channel breakdown */}
      {analytics.channelBreakdown.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 animate-slide-up delay-300">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Channel Breakdown
          </p>
          <div className="space-y-2">
            {analytics.channelBreakdown.map((row) => {
              const ChannelIcon = CHANNEL_ICONS[row.channel];
              const deliveryPct = row.sent > 0 ? row.delivered / row.sent : 0;
              return (
                <div
                  key={row.channel}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded border flex items-center gap-1 w-28 flex-shrink-0",
                      CHANNEL_COLORS[row.channel]
                    )}
                  >
                    <ChannelIcon size={10} />
                    {row.channel}
                  </span>
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-1000"
                      style={{ width: `${deliveryPct * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-12 text-right">
                    {formatPct(deliveryPct)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const warLogs = [
  "Vercel deployment kept failing on build — had to switch to standalone output",
  "API routes throwing fetch failed errors in production",
  "Next.js App Router migration caused tons of import issues",
  "TypeScript errors everywhere after adding new types",
  "Path alias @/lib/utils not resolving properly",
  "Missing dependencies breaking the build repeatedly",
  "localStorage user name not persisting on refresh",
  "Agent reasoning panel layout breaking on mobile",
  "Telemetry stream logs not streaming in real-time",
  "Callback simulation delays not working consistently",
  "Message variant cards not highlighting selected state",
  "Glassmorphism blur effects killing performance",
  "Too many re-renders when agent was thinking",
  "Goal suggestions dropdown overlapping other elements",
  "Dark theme colors not consistent across phases",
  "Launch button animation conflicting with state changes",
  "Fake data seed not loading all 100 orders properly",
  "Channel service simulation sometimes firing callbacks twice",
  "Analytics numbers not updating after callbacks",
  "Cursor Composer breaking layout when adding too many sections",
  "Claude token limits forcing me to split prompts constantly",
  "Trying to do everything in 3 days with no sleep",
  "Balancing beautiful UI vs working backend logic",
  "Over-engineering the Neural Core orb at 2 AM",
  "Forgetting to close JSX tags multiple times",
  "Fighting with Tailwind arbitrary values for glow effects",
  "Deployment failed 7 times before it finally worked",
  "Real-time telemetry looked fake until I added proper staggering",
  "Human-in-the-loop approval flow was added last minute",
  "Realizing I built something actually impressive in 72 hours"
];

// ============================================================
// DYNAMIC CUSTOMER MATCHING (With Safe Fallback Dataset)
// ============================================================


// ============================================================================
// ACTIVE SEGMENT ROUTING PIPELINE SIMULATION
// ============================================================================
function SegmentRoutingPipelineSimulation({
  importResult,
  selectedCustomer,
  goalText,
}: {
  importResult: any;
  selectedCustomer: any;
  goalText: string;
}) {
  const allCustomers: any[] = importResult?.importedCustomers || importResult?.preview || [];
  const activeCustomer = selectedCustomer || allCustomers[0] || null;
  const totalCustomersCount = importResult?.customersAdded ?? importResult?.totalCustomers ?? allCustomers.length ?? 0;
  const totalOrdersCount = importResult?.ordersAdded ?? importResult?.totalOrders ?? 0;

  const displayName = activeCustomer?.name || "—";
  const getAvatar = (name: string) =>
    name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  const avatar = activeCustomer ? getAvatar(displayName) : "—";

  // ── Derive all display values from REAL customer attributes ─────────────────
  const tier = (activeCustomer?.tier || "bronze").toLowerCase();
  const custStatus = (activeCustomer?.status || "active").toLowerCase();
  const engScore: number = activeCustomer?.engagementScore ?? 50;
  const preferredCh = (activeCustomer?.preferredChannel || "email").toLowerCase();

  // Days since last order
  const daysSince = activeCustomer?.lastOrderDate
    ? Math.floor((Date.now() - new Date(activeCustomer.lastOrderDate).getTime()) / 86_400_000)
    : 0;

  // Tier insight
  const tierInsight =
    tier === "platinum" ? "Platinum tier — top 5% LTV cohort" :
    tier === "gold"     ? "Gold tier — high-value repeat buyer" :
    tier === "silver"   ? "Silver tier — growing engagement" :
                          "Bronze tier — early lifecycle stage";

  // Recency insight
  const recencyInsight =
    daysSince > 90 ? `Dormancy alert: ${daysSince}d since last order` :
    daysSince > 45 ? `Re-engagement window: ${daysSince}d inactive` :
    daysSince > 14 ? `Moderate recency: last order ${daysSince}d ago` :
    daysSince > 0  ? `Active buyer: ordered ${daysSince}d ago` :
                     "No prior order on record";

  // Engagement insight
  const engInsight =
    engScore >= 70 ? `High engagement index: ${engScore}/100` :
    engScore >= 45 ? `Moderate engagement: ${engScore}/100` :
                     `Low signal — nurture flow eligible: ${engScore}/100`;

  const insights = activeCustomer
    ? [tierInsight, recencyInsight, engInsight]
    : ["Ingest customer data to activate insights", "Routing engine will populate automatically", "Persona and LTV signals pending"];

  // Timeline from real dates
  const lastOrderLabel = activeCustomer?.lastOrderDate
    ? new Date(activeCustomer.lastOrderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const joinedRaw = activeCustomer?.joinedDate || activeCustomer?.joinDate;
  const joinedLabel = joinedRaw
    ? new Date(joinedRaw).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  const timeline = activeCustomer ? [
    ...(joinedLabel ? [{ label: "Customer since", time: joinedLabel }] : []),
    ...(lastOrderLabel ? [{ label: "Last order date", time: lastOrderLabel }] : []),
    { label: `${daysSince > 45 ? "Re-engagement" : "Broadcast"} segment match`, time: "Now" },
  ] : [
    { label: "Awaiting data ingestion", time: "—" },
  ];

  // Engine status from real attributes
  const engineStatus = !activeCustomer ? "Engine idle — no data ingested" :
    daysSince > 90 ? "Win-back routing matrix active" :
    daysSince > 45 ? "Re-engagement routing active" :
    custStatus === "at_risk" ? "Churn prevention gateway engaged" :
    (tier === "platinum" || tier === "gold") ? "VIP priority lane routing" :
    "Standard routing gateway";

  // Gateway config: preferred channel ACTIVE, others STANDBY
  const gatewayConfig = [
    { name: "WhatsApp Gateway", chKey: "whatsapp", protocol: "WABA/v2.4", latency: "14ms", baseColor: "emerald" },
    { name: "Email SMTP Relays", chKey: "email",    protocol: "SES/TLS1.3", latency: "42ms", baseColor: "blue"    },
    { name: "SMS Ingest Node",   chKey: "sms",      protocol: "SMPP/v3.4",  latency: "8ms",  baseColor: "amber"   },
  ].map(g => ({
    ...g,
    isActive: activeCustomer ? g.chKey === preferredCh : false,
    status: activeCustomer && g.chKey === preferredCh ? "ACTIVE" : "STANDBY",
    color: g.chKey === "whatsapp"
      ? "text-emerald-400 border-emerald-950/50 bg-emerald-950/15"
      : g.chKey === "email"
      ? "text-blue-400 border-blue-950/50 bg-blue-950/15"
      : "text-amber-400 border-amber-950/50 bg-amber-950/15",
    dot: activeCustomer && g.chKey === preferredCh
      ? (g.chKey === "whatsapp" ? "bg-emerald-500" : g.chKey === "email" ? "bg-blue-500" : "bg-amber-500")
      : "bg-slate-600",
  }));

  const tierColor =
    tier === "platinum" ? "from-slate-200 to-slate-400" :
    tier === "gold"     ? "from-amber-300 to-yellow-500" :
    tier === "silver"   ? "from-slate-300 to-slate-500" :
                          "from-orange-400 to-amber-600";
  const tierBadgeStyle =
    tier === "platinum" ? "bg-slate-800/60 text-slate-200 border-slate-600/50" :
    tier === "gold"     ? "bg-amber-950/60 text-amber-300 border-amber-700/40" :
    tier === "silver"   ? "bg-slate-800/60 text-slate-300 border-slate-600/40" :
                          "bg-orange-950/50 text-orange-400 border-orange-800/40";

  return (
    <section data-tour="pipeline-diagram" className="w-full py-10 mb-12">
      {/* ── Section header ── */}
      <div className="relative mb-8">
        <div className="absolute -inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              Channel Routing Preview
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Live preview for the selected customer — tier, engagement, and the channel AIRA would route them through
            </p>
          </div>
          <div className="flex gap-2 flex-wrap text-[10px] font-mono">
            <span className="px-2.5 py-1 rounded-lg border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 font-semibold">
              {totalCustomersCount} customers in store
            </span>
            <span className="px-2.5 py-1 rounded-lg border border-indigo-900/60 bg-indigo-950/30 text-indigo-400 font-semibold">
              {totalOrdersCount} orders ingested
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch relative">
        {/* SVG wires */}
        <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path d="M 250 150 H 290" stroke="url(#wg1)" strokeWidth="2" fill="none" />
          <path d="M 545 150 H 590" stroke="url(#wg2)" strokeWidth="2" fill="none" />
          <path d="M 720 150 C 740 150, 750 70, 785 70" stroke="url(#wg3)" strokeWidth="1.5" fill="none" />
          <path d="M 720 150 H 785" stroke="url(#wg3)" strokeWidth="1.5" fill="none" />
          <path d="M 720 150 C 740 150, 750 230, 785 230" stroke="url(#wg3)" strokeWidth="1.5" fill="none" />
          <circle r="3" fill="#a855f7"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 250 150 H 290" /></circle>
          <circle r="3" fill="#6366f1"><animateMotion dur="2.8s" repeatCount="indefinite" path="M 545 150 H 590" /></circle>
          <circle r="3" fill="#ec4899"><animateMotion dur="3.6s" repeatCount="indefinite" path="M 720 150 C 740 150, 750 70, 785 70" /></circle>
          <circle r="3" fill="#3b82f6"><animateMotion dur="3.2s" repeatCount="indefinite" path="M 720 150 H 785" /></circle>
          <circle r="3" fill="#10b981"><animateMotion dur="4s" repeatCount="indefinite" path="M 720 150 C 740 150, 750 230, 785 230" /></circle>
        </svg>

        {/* ── Column A: User Node ── */}
        <div className="col-span-12 lg:col-span-3 rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/60 to-slate-950/80 backdrop-blur-sm relative flex flex-col overflow-hidden">
          {/* Subtle top glow bar */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">User Node</p>
              <span className="text-[9px] font-mono bg-purple-950/50 text-purple-300 border border-purple-800/40 px-1.5 py-0.5 rounded-md">LIVE FOCUS</span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-base shadow-lg border border-white/10 text-white flex-shrink-0", tierColor)}>
                {avatar}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate leading-tight">{displayName}</h4>
                <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{activeCustomer?.email || "—"}</p>
                {activeCustomer?.city && (
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">{activeCustomer.city}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 font-mono text-[11px] mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">LTV</span>
                <span className="text-emerald-400 font-bold">₹{(activeCustomer?.totalSpend || activeCustomer?.totalSpent || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Orders</span>
                <span className="text-indigo-300 font-bold">{activeCustomer?.orderCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tier</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase", tierBadgeStyle)}>{tier}</span>
              </div>
            </div>

            {/* Engagement bar */}
            {activeCustomer && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-slate-600 uppercase">Engagement</span>
                  <span className="text-[9px] font-mono text-slate-400">{engScore}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div
                    className={cn("h-full rounded-full transition-all", engScore >= 70 ? "bg-emerald-500" : engScore >= 45 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${engScore}%` }}
                  />
                </div>
              </div>
            )}

            <div className="text-[9px] font-mono text-indigo-400/70 bg-indigo-950/20 border border-indigo-900/30 rounded-lg px-2 py-1.5 mt-auto">
              Selected from Customer Spotlight · scroll up to change
            </div>
          </div>
          <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-slate-950 -translate-y-1/2 z-10 shadow-[0_0_8px_#7c3aed]" />
        </div>

        {/* ── Column B: Behavior Track ── */}
        <div className="col-span-12 lg:col-span-3 rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/60 to-slate-950/80 backdrop-blur-sm relative overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="p-5 flex flex-col h-full gap-4">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Behavior Track</p>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2.5">Audience Insights</p>
              <ul className="space-y-2">
                {insights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300 font-mono">
                    <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3">Behavior Timeline</p>
              <div className="space-y-3">
                {timeline.map((tick, i) => (
                  <div key={tick.label} className="flex items-start gap-2">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn("w-2 h-2 rounded-full ring-2", i === timeline.length - 1 ? "bg-emerald-400 ring-emerald-900 animate-pulse" : "bg-indigo-400 ring-indigo-900")} />
                      {i < timeline.length - 1 && <div className="w-px h-5 bg-indigo-800/50 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-200 font-mono leading-tight">{tick.label}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{tick.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-slate-950 -translate-y-1/2 z-10 shadow-[0_0_8px_#7c3aed]" />
        </div>

        {/* ── Column C: AIRA Brain ── */}
        <div className="col-span-12 lg:col-span-2 flex flex-col items-center justify-center p-4 relative">
          <div className="relative w-full max-w-[140px] aspect-square flex items-center justify-center mx-auto">
            <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/25 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border-2 border-double border-violet-400/30 animate-spin-reverse-slow" />
            <div className="absolute inset-0 rounded-full bg-indigo-500/5 blur-xl" />
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/10 hover:scale-105 transition-transform duration-300 cursor-default">
              <Brain size={28} className="text-white" />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-mono text-center text-indigo-300 uppercase tracking-wider leading-relaxed">
            AIRA<br />Routing Engine
          </p>
          <p className="mt-1 text-[9px] font-mono text-slate-600 text-center max-w-[120px] leading-tight">
            {engineStatus}
          </p>
          <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 -translate-y-1/2 z-10 shadow-[0_0_8px_#10b981]" />
        </div>

        {/* ── Column D: Gateway Routing Map ── */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/60 to-slate-950/80 backdrop-blur-sm overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="p-5 flex flex-col h-full">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-4">Gateway Routing Map</p>
            <div className="space-y-3 flex-1">
              {gatewayConfig.map((gateway) => (
                <div
                  key={gateway.name}
                  className={cn(
                    "rounded-xl border p-3.5 font-mono text-xs transition-all duration-200",
                    gateway.color,
                    gateway.isActive && "shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-700/60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", gateway.dot, gateway.isActive && "animate-pulse")} />
                      <span className="font-bold tracking-tight">{gateway.name}</span>
                    </div>
                    {gateway.isActive && (
                      <span className="text-[8px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        PREFERRED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] opacity-70">
                    <span>{gateway.protocol}</span>
                    <span className="flex items-center gap-1">
                      <span className={cn("font-semibold", gateway.isActive ? "opacity-100" : "")}>{gateway.status}</span>
                      <span className="text-slate-600">·</span>
                      <span>{gateway.latency}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[9px] font-mono text-slate-700 border-t border-slate-900 pt-3 leading-tight">
              AIRA routes messages through the customer&apos;s preferred channel. The other two are kept on standby.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Builder Dossier (collapsible) ───────────────────────────────────────────

function BuilderDossier() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-800/60 overflow-hidden bg-gradient-to-b from-slate-900/50 to-slate-950/80">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left group hover:bg-slate-800/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Users size={13} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-mono">About the Builder — Aira K. Salish</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Who built AIRA and why · click to expand</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn("text-slate-500 transition-transform duration-300 flex-shrink-0", open && "rotate-180")}
        />
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-6 pb-8 border-t border-slate-800/50 animate-slide-up">
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Avatar + tags */}
            <div className="lg:col-span-3 flex flex-col items-center text-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-rose-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
                <div className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                  <img src="/aira-new.jpg" alt="Aira K. Salish" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest bg-purple-950/50 border border-purple-800/40 text-purple-300 px-2.5 py-0.5 rounded-full uppercase font-bold block">
                  AI/ML Student
                </span>
                <p className="text-[10px] font-mono text-slate-500">SRMIST · CSE (AI/ML)</p>
                <p className="text-[10px] font-mono text-slate-600">RA2311026011017</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  { label: "linkedin", href: "https://linkedin.com/in/airasalish" },
                  { label: "github", href: "https://github.com/ayerahh" },
                  { label: "instagram", href: "https://instagram.com/aira.kivy" },
                ].map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-800 bg-slate-950/60 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="lg:col-span-9 space-y-5">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Aira K. Salish</h2>
                <p className="text-xs font-mono text-purple-400 mt-1">Builder of AIRA · Xeno Engineering Internship Applicant 2026</p>
              </div>

              <ul className="space-y-2.5 font-mono text-xs text-slate-300 leading-relaxed">
                {[
                  { label: "Academic Track", value: <>B.Tech CSE student specializing in <span className="text-emerald-400">AI &amp; ML</span> at SRMIST.</> },
                  { label: "Leadership", value: <>Technical Lead (AI/ML) at <span className="text-rose-400">ACM Women (ACMW)</span>.</> },
                  { label: "Industry", value: <>Former Prompt Engineering Intern at <span className="text-emerald-400">BabyBillion Pvt. Ltd.</span></> },
                  { label: "Mentorship", value: <>Worked under <span className="text-emerald-400">Dinesh Godara</span> — former VP at Unacademy, founder of BabyBillion.</> },
                  { label: "Shipped", value: <><span className="text-rose-400">Generative AI Researcher</span> for the Spotted app (founded by Amit Baradia).</> },
                  { label: "Open Source", value: <>GSSoC contributor · Graduate of <span className="text-emerald-400">CitiBridge</span> Program 2026 by Citibank.</> },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">▪</span>
                    <span><strong className="text-slate-200">{item.label}:</strong> {item.value}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-slate-800/50 text-[11px] font-mono text-slate-400 space-y-1">
                <div><span className="text-slate-600 mr-2">→</span><strong className="text-slate-300">Focus:</strong> Autonomous AI agents, intelligent automation, and failsafe tech layers.</div>
                <div><span className="text-slate-600 mr-2">→</span><strong className="text-slate-300">Vision:</strong> Engineering abstract concepts into products with real-world impact.</div>
              </div>

              <blockquote className="border-l-2 border-purple-500 bg-purple-950/10 rounded-r-xl px-4 py-2.5 italic text-xs text-slate-400 font-mono">
                &ldquo;Building AI agents and systems that bridge the gap between abstract innovation and deterministic execution.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [goalText, setGoalText] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownMatches, setDropdownMatches] = useState<CampaignSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [debouncedText, setDebouncedText] = useState("");
  const [userName, setUserName] = useState("");
  const [guidedDemo, setGuidedDemo] = useState(false);

  // Ingestion portal states
  const [importType, setImportType] = useState<"beauty-brand" | "fitness-brand">("beauty-brand");
  const [importCustomerCount, setImportCustomerCount] = useState<number>(50);
  const [importOrdersPerCustomer, setImportOrdersPerCustomer] = useState<number>(5);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<CampaignSuggestion[]>([]);

  // New States for Observability drawer and spotlight customer cycle
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
  const [selectedSpotlightCustomer, setSelectedSpotlightCustomer] = useState<any>(null);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Fetch data-driven campaign suggestions whenever the customer base changes
  useEffect(() => {
    if (!importResult) return;
    fetch("/api/campaigns/suggestions")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setDynamicSuggestions(data.suggestions);
        }
      })
      .catch(() => {});
  }, [importResult]);

  // Auto-seed demo data if guided tour starts and no data is loaded yet
  useEffect(() => {
    if (guidedDemo && !importResult) {
      const autoSeed = async () => {
        try {
          const response = await fetch("/api/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "beauty-brand",
              customerCount: 50,
              ordersPerCustomer: 5,
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            setImportResult(data);
          }
        } catch (err) {
          console.error("Failed to auto-seed demo data for guided tour:", err);
        }
      };
      autoSeed();
    }
  }, [guidedDemo, importResult]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleImport = async () => {
    setIsImporting(true);
    setToast(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: importType,
          customerCount: importCustomerCount,
          ordersPerCustomer: importOrdersPerCustomer,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok && data.success) {
        setToast({
          type: "success",
          message: `Imported ${data.customersAdded} customers and ${data.ordersAdded} orders. (${data.duplicatesSkipped} duplicates skipped).`,
        });
      } else {
        setToast({
          type: "error",
          message: data.error || "Failed to import customers.",
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setToast({
          type: "error",
          message: "Import process timed out (exceeded 15 seconds).",
        });
      } else {
        setToast({
          type: "error",
          message: err.message || "An unexpected error occurred during import.",
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Session Operator Name States
  const [isEditingName, setIsEditingName] = useState(false);

  // "Issues I Faced" Sidebar State
  const [isWarLogsOpen, setIsWarLogsOpen] = useState(false);

  // First-Time Welcome Demo Modal State
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRunIdRef = useRef(0);
  // ANTIGRAVITY REF FIX:
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("aira_user_name");
    if (stored) setUserName(stored);
  }, []);

  useEffect(() => {
    const hasSeen = localStorage.getItem("aira_has_seen_welcome");
    if (!hasSeen) {
      setShowWelcomeModal(true);
    }
  }, []);

  // Session Operator Name - Save to localStorage whenever userName changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem("aira_user_name", userName);
    }
  }, [userName]);

  // "Issues I Faced" - Close sidebar with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isWarLogsOpen) {
        setIsWarLogsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isWarLogsOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(goalText), 150);
    return () => clearTimeout(timer);
  }, [goalText]);

  useEffect(() => {
    const lower = debouncedText.toLowerCase().trim();
    if (!lower) {
      setDropdownMatches([]);
      setShowDropdown(false);
      setSelectedIndex(0);
      return;
    }
    const tokens = lower.split(/\s+/).filter((t) => t.length > 1);
    // Dynamic suggestions (data-driven) appear first, seed list fills the rest
    const allSuggestions = [...dynamicSuggestions, ...SEED_SUGGESTIONS];
    const filtered = allSuggestions.filter((suggestion) => {
      const haystack = `${suggestion.label} ${suggestion.text}`.toLowerCase();
      const prefixMatch =
        haystack.startsWith(lower) ||
        suggestion.label.toLowerCase().startsWith(lower);
      const keywordMatch = tokens.some((token) => haystack.includes(token));
      return prefixMatch || keywordMatch;
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true }))
    .slice(0, 20);
    setDropdownMatches(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(0);
  }, [debouncedText]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleTextareaChange = (value: string) => {
    setGoalText(value);
  };

  const getProfileIdentity = () => {
    const trimmed = userName.trim();
    const displayName = trimmed || "Session Profile";
    const firstName = trimmed.split(/\s+/)[0] || "there";
    const avatar = trimmed
      ? trimmed
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "SP";
    return { displayName, firstName, avatar };
  };

  const getDynamicPipelineData = (): PipelineData => {
    const lower = goalText.toLowerCase();
    const { displayName, firstName, avatar } = getProfileIdentity();

    if (/churn|90\s*days?|win.?back|lapsed|inactive|re-engage/.test(lower)) {
      return {
        dossier: {
          name: displayName,
          avatar,
          location: "Pune, India",
          ltv: "₹7,650",
          preferredChannels: "Email, WhatsApp",
          tiers: ["High Value", "Loyal Customer"],
          insight: "Likely to Churn",
          path: "Email/WhatsApp",
        },
        insights: [
          "High Engagement",
          "Frequent Shopper",
          "Tier Reactivation Candidate",
        ],
        timeline: [
          { label: "Last Purchase", time: "94 days ago" },
          { label: "Viewed Win-back Page", time: "2h ago" },
          { label: "Tier Reward Eligible", time: "Now" },
        ],
        channels: [
          {
            type: "email",
            message:
              `${firstName}, your exclusive 15% tier reward expires in 48h — we've reserved your personalised comeback offer.`,
            productLabel: "Velour Linen Collection",
          },
          {
            type: "whatsapp",
            message:
              `Hi ${firstName} — we miss you at Velour. Your Platinum-tier reward is loaded. Tap to claim before Sunday.`,
            productLabel: "Premium Apparel Drop",
          },
          {
            type: "sms",
            message:
              `VELour: ${firstName}, ₹500 store credit awaits. Reactivate your account today.`,
            productLabel: "Win-back Voucher",
          },
        ],
        engineStatus: "Win-back routing matrix active",
      };
    }

    if (/cart|abandon|₹2,?499|recovery|drop.?off|mumbai/.test(lower)) {
      return {
        dossier: {
          name: displayName,
          avatar,
          location: "Pune, India",
          ltv: "₹7,650",
          preferredChannels: "SMS, WhatsApp",
          tiers: ["High Cart Value", "Recovery Target"],
          insight: "High Cart Value",
          path: "SMS/WhatsApp Gateway",
        },
        insights: [
          "Abandoned Cart Detected",
          "Premium Basket Value",
          "48h Recovery Window",
        ],
        timeline: [
          { label: "Viewed Product", time: "2h ago" },
          { label: "Added to Cart", time: "3h ago" },
          { label: "Cart Abandoned", time: "48m ago" },
        ],
        channels: [
          {
            type: "sms",
            message:
              `${firstName}, your ₹2,499 cart is reserved for 2h. Complete checkout for ₹250 wallet credit.`,
            productLabel: "Urban Streetwear Set",
          },
          {
            type: "whatsapp",
            message:
              "Meera, 3 items in your Mumbai cart are selling fast. Tap to recover with free shipping.",
            productLabel: "Minimalist Apparel Bundle",
          },
          {
            type: "email",
            message:
              "Your premium cart is waiting — exclusive recovery voucher applied at checkout.",
            productLabel: "Cart Recovery Offer",
          },
        ],
        engineStatus: "Cart recovery gateway engaged",
      };
    }

    if (/apparel|streetwear|arrival|drop|collection|minimalist/.test(lower)) {
      return {
        dossier: {
          name: displayName,
          avatar,
          location: "Pune, India",
          ltv: "₹7,650",
          preferredChannels: "WhatsApp, Email",
          tiers: ["Style Affinity", "Early Access"],
          insight: "High Style Affinity",
          path: "WhatsApp Drop",
        },
        insights: [
          "Streetwear Affinity",
          "Catalog Drop Interest",
          "Sizing Queue Eligible",
        ],
        timeline: [
          { label: "Browsed Streetwear", time: "1h ago" },
          { label: "Saved Drop Preview", time: "3h ago" },
          { label: "Sizing Queue Open", time: "Now" },
        ],
        channels: [
          {
            type: "whatsapp",
            message:
              `${firstName}, the minimalist streetwear drop opens in 6h. Reserve your size before the queue closes.`,
            productLabel: "Urban Drop S/S '26",
          },
          {
            type: "email",
            message:
              "Early sizing reservation is live for the new apparel collection — lock your fit now.",
            productLabel: "Catalog Preview",
          },
          {
            type: "sms",
            message:
              "VELour Drop Alert: Your streetwear size block is held for 24h. Confirm to secure.",
            productLabel: "Size Reservation",
          },
        ],
        engineStatus: "Apparel drop routing pipeline live",
      };
    }

    if (/vip|loyalty|spender|exclusive|flash.?sale|top\s*5/.test(lower)) {
      return {
        dossier: {
          name: displayName,
          avatar,
          location: "Pune, India",
          ltv: "₹7,650",
          preferredChannels: "Email, WhatsApp",
          tiers: ["VIP Tier", "Top 5% Spender"],
          insight: "Priority Access Eligible",
          path: "VIP Early Access Lane",
        },
        insights: [
          "Top 5% LTV Cohort",
          "Repeat Spender",
          "Flash-sale Priority",
        ],
        timeline: [
          { label: "Tier Upgrade", time: "12d ago" },
          { label: "Flash Pass Issued", time: "1h ago" },
          { label: "Weekend Volume Slot", time: "Reserved" },
        ],
        channels: [
          {
            type: "email",
            message:
              `${firstName}, your exclusive early-access flash-sale pass is active — shop 48h before public launch.`,
            productLabel: "VIP Flash Pass",
          },
          {
            type: "whatsapp",
            message:
              "Priority lane unlocked: weekend volume metrics boost with your VIP loyalty lift matrix.",
            productLabel: "Loyalty Lift Bundle",
          },
          {
            type: "sms",
            message:
              "VELour VIP: Your early-access window opens Friday 6AM. Maximize lifetime metrics now.",
            productLabel: "Priority Access",
          },
        ],
        engineStatus: "VIP loyalty lift matrix routing",
      };
    }

    return {
      dossier: {
        name: displayName,
        avatar,
        location: "Pune, India",
        ltv: "₹7,650",
        preferredChannels: "Email, WhatsApp",
        tiers: ["Monitoring", "Active Profile"],
        insight: "Ready — import your customers and describe your goal",
        path: "Waiting for campaign input…",
      },
      insights: [
        "Session Active",
        "Intent Capture Pending",
        "Channel Routing Standby",
      ],
      timeline: [
        { label: "Browsing urban styles", time: "Live" },
        { label: "Cart active", time: "Monitoring" },
        { label: "Standing by", time: "Idle" },
      ],
      channels: [
        {
          type: "email",
          message: "Awaiting campaign goal — describe what you want to do and AIRA will route this channel.",
          productLabel: "No SKU bound",
        },
        {
          type: "whatsapp",
          message: "Standing by for campaign intent routing configuration.",
          productLabel: "Channel idle",
        },
        {
          type: "sms",
          message: "Standby — channel activates once you run a campaign.",
          productLabel: "Gateway standby",
        },
      ],
      engineStatus: "Neutral monitoring state",
    };
  };

  // ── Run the agent (POST → /api/agent/run) ──────────────────────────────────

  const runAgent = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? goalText).trim();
    if (!text || phase !== "idle") return;

    setError(null);
    setPhase("thinking");
    setCurrentStepIndex(0);
    setCampaign(null);
    setAnalytics(null);
    setShowDropdown(false);

    const runId = ++activeRunIdRef.current;
    const startTime = Date.now();

    // Animate through local thinking steps while the server works
    let stepIdx = 0;
    const advanceStep = () => {
      if (runId !== activeRunIdRef.current) return;
      stepIdx++;
      if (stepIdx < THINKING_STEPS.length) {
        setCurrentStepIndex(stepIdx);
        setTimeout(advanceStep, STEP_DURATIONS[stepIdx] ?? 1200);
      }
    };
    setTimeout(advanceStep, STEP_DURATIONS[0]);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText: text }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Agent failed to process your goal.");
      }

      // Wait until UI finishes last step animation
      const totalAnimTime = STEP_DURATIONS.reduce((a, b) => a + b, 0);
      const remaining = totalAnimTime - (Date.now() - startTime);
      await new Promise((r) => setTimeout(r, Math.max(0, remaining)));

      setCampaign(data.campaign);
      setSelectedVariantId(data.campaign.chosenVariantId);

      // Small pause before revealing results
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStepIndex(THINKING_STEPS.length); // mark all done
      await new Promise((r) => setTimeout(r, 300));
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("idle");
    }
  }, [goalText, phase]);

  // ── Launch the campaign ────────────────────────────────────────────────────

  const launchCampaign = useCallback(async () => {
    if (!campaign || phase !== "review") return;

    setPhase("launching");

    try {
      const res = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          chosenVariantId: selectedVariantId ?? campaign.chosenVariantId,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Launch failed.");
      }

      setAnalytics(data.analytics);
      setCampaign(data.campaign);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed.");
      setPhase("review");
    }
  }, [campaign, phase, selectedVariantId]);

  // ── Reset everything ───────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase("idle");
    setGoalText("");
    setCampaign(null);
    setAnalytics(null);
    setError(null);
    setCurrentStepIndex(0);
    setSelectedVariantId(null);
    setShowDropdown(false);
    setDropdownMatches([]);
    setSelectedIndex(0);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // ── Live analytics polling while campaign is in results phase ─────────────
  useEffect(() => {
    if (phase !== "results" || !campaign) return;
    const id = campaign.id;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.analytics) setAnalytics(data.analytics);
        if (data.campaign) setCampaign((prev) => prev?.id === id ? data.campaign : prev);
      } catch {}
    };
    const interval = setInterval(poll, 2500);
    return () => { active = false; clearInterval(interval); };
  }, [phase, campaign?.id]);

  // ── Refresh campaign history whenever a campaign is launched ───────────────
  useEffect(() => {
    if (phase !== "results") return;
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPastCampaigns(data); })
      .catch(() => {});
  }, [phase]);

  // ── Copy message body ──────────────────────────────────────────────────────

  const copyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── First-time user welcome modal actions ──────────────────────────────────

  const handleStartDemo = useCallback(() => {
    localStorage.setItem("aira_has_seen_welcome", "true");
    setShowWelcomeModal(false);
    const demoGoal = "Launch a high-conversion email campaign for active customers with a special 20% discount code.";
    setGoalText(demoGoal);
    // Trigger runAgent after a short timeout so state update finishes
    setTimeout(() => {
      runAgent(demoGoal);
    }, 200);
  }, [runAgent]);

  const handleCloseWelcome = useCallback(() => {
    localStorage.setItem("aira_has_seen_welcome", "true");
    setShowWelcomeModal(false);
  }, []);

  // ============================================================================
  // ANTIGRAVITY VIEWPORT CONTROLLER (POST-LAYOUT SHIFT STABLE)
  // ============================================================================
  useEffect(() => {
    if (phase === "review") {
      // 350ms delay accommodates both your new upper search bar placement 
      // and the CSS expand animations before running position calculations
      const handleVisualScrollHandoff = setTimeout(() => {
        if (reviewSectionRef.current) {
          reviewSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 350);

      return () => clearTimeout(handleVisualScrollHandoff);
    }
  }, [phase]);

  // ─── Derived values ──────────────────────────────────────────────────────

  const isThinking = phase === "thinking";
  const isReview = phase === "review";
  const isLaunching = phase === "launching";
  const isResults = phase === "results";
  const isIdle = phase === "idle";

  const chosenVariant = campaign?.messageVariants.find(
    (v) => v.id === (selectedVariantId ?? campaign.chosenVariantId)
  );

  const ChosenChannelIcon = chosenVariant
    ? CHANNEL_ICONS[chosenVariant.channel]
    : Radio;

  const pipeline = getDynamicPipelineData();

  const getBlobColors = () => {
    switch (phase) {
      case "thinking":
        return {
          blob1: "from-amber-500/15 to-yellow-600/5",
          blob2: "from-violet-600/15 to-fuchsia-600/5",
        };
      case "results":
        return {
          blob1: "from-emerald-500/15 to-teal-600/5",
          blob2: "from-indigo-600/20 to-violet-600/5",
        };
      default:
        return {
          blob1: "from-purple-600/15 to-rose-600/5",
          blob2: "from-indigo-600/15 to-violet-600/5",
        };
    }
  };
  const blobs = getBlobColors();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-canvas bg-grid relative overflow-x-hidden transition-colors duration-350"
      style={{
        ["--mouse-x" as any]: `${mousePos.x}px`,
        ["--mouse-y" as any]: `${mousePos.y}px`,
      }}
    >
      {/* 2026 Ambient Shifting Mesh Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-[10%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr ${blobs.blob1} filter blur-[90px] animate-orb-one transition-all duration-1000`} />
        <div className={`absolute top-[35%] -right-[10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br ${blobs.blob2} filter blur-[90px] animate-orb-two transition-all duration-1000`} />
      </div>


      {/* Sharp Premium Radial Pointer Light Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.22) 0%, rgba(99, 102, 241, 0.06) 45%, transparent 100%)`
        }}
      />

      {/* ============================================================
          SECTION 2: FULL-SCREEN BRANDING LANDING TAKEOVER (100vh Takeover)
          ============================================================ */}
      <section data-tour="platform-takeover" className="w-screen h-screen min-h-screen bg-slate-950 relative flex flex-col justify-between items-center overflow-hidden p-8 md:p-16 border-b border-purple-500/10 z-10">
        
        {/* Deep Field Ambient Grid Mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#090d16_1px,transparent_1px),linear-gradient(to_bottom,#090d16_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_15%,#000_75%)] opacity-60 pointer-events-none" />

        {/* Floating AI Agent Badges in background grid */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Segment Agent */}
          <div className="absolute top-[20%] left-[10%] md:left-[15%] p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce select-none" style={{ animationDuration: "7s" }}>
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Segment Agent · ACTIVE</span>
          </div>
          {/* Copy Agent */}
          <div className="absolute top-[35%] right-[8%] md:right-[12%] p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce select-none" style={{ animationDuration: "9s" }}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Copy Variant Node · IDLE</span>
          </div>
          {/* Channel Router */}
          <div className="absolute bottom-[30%] left-[12%] md:left-[18%] p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce select-none" style={{ animationDuration: "8s" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Channel Router · STANDBY</span>
          </div>
        </div>

        {/* Center Premium Display Headers */}
        <div className="relative z-10 w-full text-center mt-auto space-y-6">
          {/* Soft radial gradient behind the wordmark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 filter blur-[90px] pointer-events-none z-0" />
          
          {/* Orbiting agent dots with thin glowing trails */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] pointer-events-none z-0">
            {/* Orbit 1 */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "10s" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-purple-500/30 to-transparent -mt-5 rounded-full origin-bottom" />
            </div>
            {/* Orbit 2 */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "16s", animationDirection: "reverse" }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-gradient-to-t from-cyan-400/30 to-transparent -mb-4 rounded-full origin-top" />
            </div>
            {/* Orbit 3 */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "22s" }}>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-6 bg-gradient-to-r from-emerald-400/30 to-transparent -ml-5 rounded-full origin-right" />
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-rose-500/10 border border-purple-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-slate-300 font-bold">
                AI-Native CRM Platform
              </span>
            </div>
            
            <h1 className="text-8xl md:text-9xl font-black text-white tracking-tighter uppercase select-none bg-clip-text bg-gradient-to-b from-white via-white to-slate-700/30 filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              AIRA
            </h1>
            
            <p className="text-xs font-mono text-slate-400 tracking-wider max-w-md mx-auto leading-relaxed">
              Type a goal. AIRA finds the right customers, writes their messages, picks the best channel, and shows you live delivery results.
            </p>

            {/* Launch Console CTA and scroll down guide */}
            <div className="flex flex-col items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  document.getElementById("app-console")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-rose-500 to-indigo-600 hover:from-purple-500 hover:via-rose-400 hover:to-indigo-500 text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_35px_rgba(139,92,246,0.35)] hover:shadow-[0_0_50px_rgba(139,92,246,0.55)] flex items-center gap-2 border border-white/10 uppercase tracking-widest font-mono"
              >
                Open Campaign Console
                <ArrowRight size={13} className="animate-pulse" />
              </button>
              
              <div 
                onClick={() => {
                  document.getElementById("app-console")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity mt-6 cursor-pointer select-none"
              >
                <span className="text-[9px] font-mono tracking-widest uppercase text-slate-500">Scroll to explore</span>
                <div className="w-5 h-8 border border-slate-800 rounded-full flex justify-center p-1 bg-slate-950/20">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-900 pt-8 mt-auto text-left font-mono">
          <div className="glass-panel glass-panel-hover rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">SYSTEM TELEMETRY</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-200 font-bold">DISPATCHER ACTIVE</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Uptime: 99.98% · 200/s rate</p>
          </div>
          
          <div className="glass-panel glass-panel-hover rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">REASONING CORE</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-slate-200 font-bold">GROQ LLAMA 3.3</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Token Latency: ~12ms · 70B</p>
          </div>
          
          <div className="glass-panel glass-panel-hover rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">DATA STORE</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs text-slate-200 font-bold">IN-MEMORY STORE</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Import customers to activate</p>
          </div>
          
          <div className="glass-panel glass-panel-hover rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ROUTING GATEWAYS</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs text-slate-200 font-bold">STANDBY DISPATCH</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">WhatsApp / SMTP relays</p>
          </div>
        </div>
      </section>

      {/* ── Ambient gradient ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header Navbar — full viewport width, outside the constrained column */}
      <header className="sticky top-0 z-50 w-full flex items-center justify-between py-3 px-6 header-glass mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center shadow-lg shadow-red-950/50 flex-shrink-0 border border-red-400/20">
            <span className="text-white text-base">🍓</span>
          </div>
          <div>
            <h2 className="font-bold text-white tracking-tight text-sm flex items-center gap-1.5">
              AIRA <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 font-mono leading-none">CRM</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-mono leading-none">Reach Agent</p>
          </div>
        </div>

        {/* Session Operator Name - with edit capability and persistence */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
  type="text"
  value={userName}
  onChange={(e) => setUserName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
    }
  }}
  onBlur={() => setIsEditingName(false)}
  placeholder="Enter your name"
  
  // CHANGED HERE: Replaced text-text-primary with text-slate-900 to ensure crisp visibility
  className="text-sm bg-white border border-purple-500/50 rounded-lg px-3 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-purple-500 font-mono"
  autoFocus
/>
              <button
                onClick={() => setIsEditingName(false)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {userName.trim().length > 1 ? (
                <>
                  <span className="text-sm text-text-secondary flex items-center gap-1.5 font-mono">
                    <Users size={12} className="inline text-slate-400" />
                    <span>{userName.trim()}</span>
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors font-mono"
                    title="Edit name"
                  >
                    edit
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  <span>+</span> add your name
                </button>
              )}
            </div>
          )}
        </div>
      </header>

<div id="app-console" className="relative z-10 max-w-5xl mx-auto px-4">

  {/* ============================================================
      ONE PROMPT, FULL CAMPAIGN CORE HEADER + VIDEO LAYER
      ============================================================ */}
  <div className="w-full my-12 animate-fade-in">
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-purple-400 uppercase">AIRA · AI Reach Agent · Campaign Engine</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
        One Prompt, <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Full Campaign</span>
      </h1>
      <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Import a customer dataset, describe what you want to achieve, and AIRA handles the rest — segmentation, copywriting, channel routing, and live delivery tracking.
      </p>
    </div>
    
    {/* ============================================================
        PREMIUM CHASSIS LIVE ANIMATION DECK (Direct Core Track)
        ============================================================ */}
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl max-w-4xl mx-auto mt-8 transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_35px_rgba(139,92,246,0.15)]">
      {/* OS Window header */}
      <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-950 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] opacity-90 shadow-[0_0_6px_#ff5f56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-90 shadow-[0_0_6px_#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] opacity-90 shadow-[0_0_6px_#27c93f]" />
        </div>
        <span className="text-[10px] font-mono text-slate-400 tracking-wider">aira_orchestrator_node_0x416.mp4</span>
        <div className="w-12 text-right">
          <span className="text-[8px] font-mono bg-purple-950 border border-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">1080p</span>
        </div>
      </div>
      <video 
        src="/s.mp4"
        className="w-full aspect-video object-cover block" 
        autoPlay={true}
        loop={true}
        muted={true}
        playsInline={true}
        controls={false}
        preload="auto"
      >
        <p className="text-center p-8 font-mono text-xs text-slate-500">
          // BROWSER RENDER ERROR: Asset file path cannot be resolved.
        </p>
      </video>
    </div>
    
    <p className="text-center font-mono text-[10px] text-slate-500 mt-3 uppercase tracking-wider">
      // recorded at SRMIST during development · all campaign logic runs live
    </p>
    
  </div>

  {/* ── How it works strip ── */}
  <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono text-slate-500 mb-8 animate-fade-in">
    {[
      { n: "1", label: "Load customer data" },
      { n: "2", label: "Describe your goal" },
      { n: "3", label: "AIRA builds the audience" },
      { n: "4", label: "AI writes the messages" },
      { n: "5", label: "Routed to preferred channel" },
      { n: "6", label: "Live delivery tracking" },
    ].map((step, i, arr) => (
      <Fragment key={step.n}>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full border border-purple-800/60 bg-purple-950/40 text-purple-400 font-bold flex items-center justify-center text-[9px]">{step.n}</span>
          <span className="text-slate-400">{step.label}</span>
        </span>
        {i < arr.length - 1 && <span className="text-slate-700 hidden sm:inline">→</span>}
      </Fragment>
    ))}
  </div>

  {/* ============================================================
      AI BUSINESS ONBOARDING PORTAL (Inputs, Intelligence Report)
      ============================================================ */}
  <div data-tour="onboarding-portal">
    <BusinessOnboardingPortal
      importResult={importResult}
      onImportSuccess={setImportResult}
    />
  </div>

  {importResult && (
    <div data-tour="customer-spotlight">
      <TopCustomerSpotlight
        importResult={importResult}
        onCustomerChange={setSelectedSpotlightCustomer}
      />
    </div>
  )}

  {/* ============================================================
      ACTIVE SEGMENT ROUTING PIPELINE EXPLORER
      ============================================================ */}
  {importResult && (
    <SegmentRoutingPipelineSimulation
      importResult={importResult}
      selectedCustomer={selectedSpotlightCustomer}
      goalText={goalText}
    />
  )}

{/* ——— VIEWPORT 3: Goal Input Section ——— */}
{(isIdle || isThinking) && (
  <section data-tour="goal-input" className="mb-8 animate-slide-up delay-100">
    
    {/* MAIN SECTION LABEL */}
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 px-4 py-1.5 rounded-full mb-3">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-[11px] font-mono tracking-wider text-purple-300 uppercase font-bold">Step 2 — Describe your campaign goal</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white">
        What do you want to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">achieve?</span>
      </h2>
      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        Plain English works. AIRA will figure out who to reach, what to say, and how to send it.
      </p>
    </div>
    
    {/* Main Input Text Box - BIGGER & MORE PROMINENT */}
    <div className={cn(
      "relative rounded-2xl border-2 transition-all duration-300 bg-slate-950/60 p-6",
      isThinking
        ? "border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
        : "border-purple-500/30 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]"
    )}>
      
      <div className="flex items-center gap-2.5 text-xs font-mono text-purple-400 font-bold uppercase tracking-widest mb-3">
        <Brain size={13} className="text-purple-400 animate-pulse" />
        <span>Campaign goal</span>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse ml-1" />
      </div>

      <textarea
        ref={textareaRef}
        value={goalText}
        onChange={(e) => handleTextareaChange(e.target.value)}
        placeholder="e.g. Re-engage customers who haven't bought in 90 days with a 20% off win-back offer"
        className="w-full min-h-[160px] bg-slate-900/60 border-2 border-slate-700 rounded-xl p-5 text-base font-mono text-white placeholder-slate-500 outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all relative z-10"
        onKeyDown={(e) => {
          if (showDropdown && dropdownMatches.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((i) => (i < dropdownMatches.length - 1 ? i + 1 : 0));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((i) => (i > 0 ? i - 1 : dropdownMatches.length - 1));
              return;
            }
            if (e.key === "Escape") {
              setShowDropdown(false);
              return;
            }
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              const selected = dropdownMatches[selectedIndex];
              if (selected) {
                setGoalText(selected.text);
                setShowDropdown(false);
                setTimeout(() => runAgent(selected.text), 100);
              }
              return;
            }
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            runAgent();
          }
        }}
      />

      {/* Footer Row Inside Textarea Area */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-850">
        <div className="flex gap-2 flex-wrap">
          {isIdle &&
            EXAMPLE_GOALS.slice(0, 3).map((eg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTextareaChange(eg.text)}
                className="text-xs text-slate-400 hover:text-purple-300 border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 rounded-full px-3 py-1.5 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={10} className="text-purple-500/60" />
                <span>{eg.label}</span>
              </button>
            ))}
        </div>
        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">↵</kbd>
          <span className="ml-1">to run</span>
        </span>
      </div>

    </div>

    {/* Error Banner */}
    {error && (
      <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 animate-fade-in">
        <AlertCircle size={16} />
        {error}
      </div>
    )}

    {/* Run Button - BIGGER & GLOWING */}
    <div className="mt-6">
      <ShimmerButton
        onClick={() => runAgent()}
        disabled={!goalText.trim() || isThinking}
        background={goalText.trim() && !isThinking ? "rgba(139, 92, 246, 0.9)" : "rgba(30, 41, 59, 0.6)"}
        shimmerColor={goalText.trim() && !isThinking ? "#ffffff" : "rgba(255, 255, 255, 0.05)"}
        borderRadius="14px"
        className={cn(
          "w-full font-bold text-lg transition-all duration-200",
          "flex items-center justify-center gap-3 h-16 border border-white/15",
          goalText.trim() && !isThinking
            ? "text-white glow-accent hover:scale-[1.02] active:scale-[0.98] btn-nudge"
            : "text-slate-400 cursor-not-allowed"
        )}
      >
        {isThinking ? (
          <>
            <span className="inline-flex gap-1.5 mr-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="thinking-dot w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              ))}
            </span>
            <span className="text-base">Thinking…</span>
          </>
        ) : (
          <>
            <Zap size={22} className="text-purple-300" />
            <span className="text-base">Build Campaign</span>
            <ArrowRight size={18} className="text-purple-300" />
          </>
        )}
      </ShimmerButton>
    </div>

    {/* Autocomplete Suggestions */}
    {showDropdown && dropdownMatches.length > 0 && !isThinking && (
      <div className="w-full mt-4 bg-slate-950 border border-purple-500/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar divide-y divide-purple-900/30 animate-fade-in">
        <div className="bg-purple-950/30 px-4 py-2.5 text-xs text-purple-300 font-mono font-bold uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={12} />
          {dropdownMatches.length} suggestion{dropdownMatches.length !== 1 ? "s" : ""} · ↑ ↓ to navigate · Enter to use
        </div>
        {dropdownMatches.map((suggestion, idx) => (
          <button
            key={`${suggestion.label}-${idx}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setGoalText(suggestion.text);
              setShowDropdown(false);
              setTimeout(() => runAgent(suggestion.text), 100);
            }}
            className={cn(
              "w-full text-left px-4 py-3 hover:bg-purple-500/10 transition-all border-b border-purple-500/5 block font-mono",
              idx === selectedIndex && "bg-purple-500/10 border-l-2 border-l-purple-500 pl-3.5"
            )}
          >
            <div className="font-bold text-sm text-white mb-0.5 tracking-tight">
              ✦ {suggestion.label}
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-2xl">
              {suggestion.text}
            </div>
          </button>
        ))}
      </div>
    )}

  </section>
)}

        {/* ── Agent Thinking Panel ─────────────────────────────────────────── */}
        {(isThinking || isReview || isLaunching || isResults) && (
          <section className="mb-8">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    isThinking
                      ? "bg-accent/20 animate-pulse"
                      : "bg-success/20"
                  )}
                >
                  {isThinking ? (
                    <Brain size={16} className="text-accent-bright" />
                  ) : (
                    <CheckCircle2 size={16} className="text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {isThinking ? "AIRA is reasoning" : "Analysis complete"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {isThinking
                      ? `Step ${Math.min(currentStepIndex + 1, THINKING_STEPS.length)} of ${THINKING_STEPS.length}`
                      : `All ${THINKING_STEPS.length} steps done · ${
                          campaign?.agentReasoning.processingTimeMs
                            ? `${(campaign.agentReasoning.processingTimeMs / 1000).toFixed(1)}s`
                            : "done"
                        }`}
                  </p>
                </div>

                {/* Confidence badge — shown once done */}
                {campaign && !isThinking && (
                  <div className="ml-auto flex items-center gap-1.5 bg-success/10 border border-success/20 text-success text-xs font-medium px-3 py-1.5 rounded-full">
                    <TrendingUp size={11} />
                    {Math.round(campaign.agentReasoning.confidence * 100)}% confidence
                  </div>
                )}
              </div>

              {/* Steps list */}
              <div className="p-3 space-y-1">
                {THINKING_STEPS.map((step, i) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    index={i}
                    currentIndex={
                      isThinking ? currentStepIndex : THINKING_STEPS.length
                    }
                  />
                ))}
              </div>

              {/* Reasoning summary — shown once thinking is done */}
              {campaign && !isThinking && (
                <div className="mx-3 mb-3 p-4 bg-surface-2 rounded-xl border border-border animate-fade-in">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
                    What AIRA decided
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {campaign.agentReasoning.goalSummary}
                  </p>
                  {campaign.agentReasoning.riskFlags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.agentReasoning.riskFlags.map((flag, i) => (
                        <span
                          key={i}
                          className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-full px-2.5 py-0.5"
                        >
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}



<div className="h-8 w-full" />


        {/* ── Review Sections (Audience + Messages + Channel) ───────────────── */}
        {(isReview || isLaunching || isResults) && campaign && (
          <>
            {/* ── Suggested Audience ─────────────────────────────────────── */}
            <section ref={reviewSectionRef} className="mb-6 animate-slide-up scroll-mt-12">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Users size={13} className="text-accent-bright" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Suggested Audience
                </h2>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-1">
                      {campaign.audience.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {campaign.audience.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-accent-bright">
                      {campaign.audience.estimatedSize}
                    </p>
                    <p className="text-xs text-text-muted">customers</p>
                  </div>
                </div>

                {/* Rationale */}
                <p className="text-xs text-text-muted leading-relaxed mb-4 italic border-l-2 border-accent/30 pl-3">
                  {campaign.agentReasoning.segmentRationale}
                </p>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {campaign.audience.filters.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs bg-surface-3 border border-border text-text-secondary rounded-full px-3 py-1 flex items-center gap-1"
                    >
                      <ChevronRight size={10} className="text-accent-bright" />
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Message Variants ───────────────────────────────────────── */}
            <section className="mb-6 animate-slide-up delay-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
                  <MessageSquare size={13} className="text-accent-bright" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Message Variants
                </h2>
                <span className="ml-auto text-xs text-text-muted">
                  Pick one to send
                </span>
              </div>

              <div className="space-y-3">
                {campaign.messageVariants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    isChosen={
                      variant.id ===
                      (selectedVariantId ?? campaign.chosenVariantId)
                    }
                    onSelect={() => setSelectedVariantId(variant.id)}
                  />
                ))}
              </div>

              {/* Copy body button */}
              {chosenVariant && (
                <button
                  onClick={() => copyMessage(chosenVariant.body)}
                  className="mt-2 text-xs text-text-muted hover:text-text-secondary flex items-center gap-1 ml-auto transition-colors"
                >
                  <Copy size={11} />
                  {copied ? "Copied!" : "Copy selected message"}
                </button>
              )}
            </section>

            {/* ── Chosen Channel ─────────────────────────────────────────── */}
            <section className="mb-8 animate-slide-up delay-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Radio size={13} className="text-accent-bright" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Chosen Channel
                </h2>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border",
                      chosenVariant
                        ? CHANNEL_COLORS[chosenVariant.channel]
                        : "bg-surface-3 border-border"
                    )}
                  >
                    <ChosenChannelIcon size={22} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-primary capitalize">
                      {chosenVariant?.channel ?? campaign.chosenChannel}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {campaign.agentReasoning.channelRationale}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Launching spinner ────────────────────────────────────── */}
            {isLaunching && (
              <div className="flex flex-col items-center gap-4 py-8 animate-fade-in">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-accent/10 flex items-center justify-center">
                    <Send size={16} className="text-accent-bright" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary mb-1">
                    Dispatching campaign…
                  </p>
                  <p className="text-xs text-text-muted">
                    Creating records · routing to channel service · awaiting delivery callbacks
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Analytics & Live Telemetry Results ───────────────────────────── */}
        {isResults && analytics && (
          <section className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-6 rounded-lg bg-success/20 flex items-center justify-center">
                <BarChart3 size={13} className="text-success" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Campaign Results
              </h2>
              <span className="ml-2 text-xs bg-success/10 border border-success/20 text-success px-2.5 py-0.5 rounded-full">
                Active
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                Updating live
              </span>
            </div>

            {/* Live Delivery Terminal */}
            <div className="space-y-4">
              {/* Two-service explanation — clean, no button */}
              <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Two-Service Callback Loop</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  On launch, the CRM dispatches each message to a <span className="text-emerald-400">separate channel service</span>. That service simulates delivery, then posts events back to <code className="text-slate-400 font-mono bg-slate-950/60 px-1 rounded">/api/receipts</code> — updating delivered, opened, and clicked counts in real time, mirroring how providers like Twilio and SendGrid work.
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Channel service → <span className="text-slate-400">api.aira-channel-service.onrender.com</span> · <span className="text-slate-400">POST /dispatch</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pl-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <TerminalIcon size={12} className="text-amber-500" />
                Live Delivery Feed
              </div>

              <CallbackTerminal
                isCampaignActive={isResults}
                campaignId={campaign?.id ?? null}
                matchedCustomerIds={campaign?.audience?.matchedCustomerIds || []}
              />
            </div>

            {/* Structured Analytics Metric Panes */}
            <div className="w-full space-y-3">
              <AnalyticsPanel analytics={analytics} />
              {analytics.computedAt && (
                <p className="text-[10px] text-slate-600 font-mono text-right">
                  Last updated: {new Date(analytics.computedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              )}
            </div>

          </section>
                )}

      {/* ── Campaign Cycle Control Panel (above TelemetryDashboard) ── */}
      {(isReview || isResults) && (
        <section className="mb-8 mt-12 space-y-4 animate-slide-up">
          {isReview && (
            <button
              type="button"
              onClick={launchCampaign}
              className="btn-nudge w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-accent via-indigo-500 to-violet-600 hover:from-accent-bright hover:via-indigo-400 hover:to-violet-500 text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] glow-accent flex items-center justify-center gap-2 border border-white/10 shadow-lg shadow-indigo-900/30 font-mono text-sm uppercase tracking-wider"
            >
              Launch Campaign
              <ArrowRight size={16} className="animate-pulse" />
            </button>
          )}
          {isReview && campaign && (
            <div className="flex items-center justify-center gap-4 text-xs text-text-muted font-mono">
              <span>
                Campaign:{" "}
                <span className="text-text-secondary font-medium">{campaign.name}</span>
              </span>
              <span>·</span>
              <span>
                Audience:{" "}
                <span className="text-accent-bright font-medium">
                  {campaign.audience.estimatedSize} customers
                </span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={reset}
            className="w-full py-3 rounded-xl text-sm font-bold border border-purple-800/50 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 hover:text-purple-100 transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wider shadow-[0_0_16px_rgba(168,85,247,0.1)] hover:shadow-[0_0_24px_rgba(168,85,247,0.2)]"
          >
            <RefreshCw size={14} />
            Start a New Campaign
          </button>
        </section>
      )}

      {/* Right-Rail Consolidated Sidebar Controls Toolbar */}
      <div data-tour="control-toolbar" className="fixed right-0 top-[35%] z-50 flex flex-col items-end gap-3 pointer-events-auto">
        {/* What AIRA Did Trigger */}
        <button
          type="button"
          onClick={() => setIsObservabilityOpen(!isObservabilityOpen)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-l-xl border border-r-0 border-indigo-800/60 bg-indigo-950/60 font-mono text-xs text-indigo-300 hover:text-white transition-all hover:bg-indigo-900/60 shadow-2xl group"
          title="See every decision AIRA made — segment picked, channel chosen, messages written"
        >
          <TerminalIcon size={14} className={cn("text-indigo-400 group-hover:scale-110 transition-transform", isObservabilityOpen && "animate-pulse")} />
          <span className="hidden sm:inline font-bold">What AIRA Did</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        </button>

        {/* Issues I Faced Trigger */}
        <button
          type="button"
          onClick={() => setIsWarLogsOpen(!isWarLogsOpen)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-l-xl border border-r-0 border-amber-800/60 bg-amber-950/40 font-mono text-xs text-amber-300 hover:text-white transition-all hover:bg-amber-900/40 shadow-2xl group"
          title="See build errors and known issues"
        >
          <AlertCircle size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-bold">Issues I Faced</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </button>

        {/* Campaign History Trigger */}
        <button
          type="button"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-l-xl border border-r-0 font-mono text-xs transition-all shadow-2xl group",
            pastCampaigns.length > 0
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:text-white hover:bg-emerald-900/40"
              : "border-slate-800/40 bg-slate-950/30 text-slate-600 hover:text-slate-400 hover:bg-slate-900/40"
          )}
          title="View all past campaigns"
        >
          <BarChart3 size={14} className={cn("group-hover:scale-110 transition-transform", pastCampaigns.length > 0 ? "text-emerald-400" : "text-slate-600")} />
          <span className="hidden sm:inline font-bold">Campaign History</span>
          {pastCampaigns.length > 0
            ? <span className="text-[10px] bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 rounded-full px-1.5 font-bold">{pastCampaigns.length}</span>
            : <span className="text-[10px] text-slate-700 font-mono">0</span>
          }
        </button>

      </div>

      <div data-tour="observability-stack">
        <TelemetryDashboard 
          currentCampaign={campaign}
          currentAnalytics={analytics}
          isOpen={isObservabilityOpen}
          setIsOpen={setIsObservabilityOpen}
          onRestoreSnapshot={(savedCampaign, savedAnalytics) => {
            setCampaign(savedCampaign);
            setAnalytics(savedAnalytics);
            setPhase(savedAnalytics ? "results" : "review");
            setSelectedVariantId(savedCampaign.chosenVariantId);
          }}
        />
      </div>
              </div>

      {/* ============================================================
          PORTFOLIO SHOWCASE BLOCK (UNLOCKED & ALWAYS VISIBLE)
          ============================================================ */}
      <div data-tour="showcase-sections" className="w-full space-y-12 mt-12 animate-fade-in">
        <AchievementsSection />
        <AIRoadmapSection />

        {/* ── About the Builder (collapsible) ── */}
        <BuilderDossier />

        <KnownLimitationsSection />
      </div>





      {/* ============================================================
         COLLAPSIBLE RIGHT SIDEBAR - ISSUES I FACED
         ============================================================ */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-black/95 backdrop-blur-xl border-l border-purple-500/30 shadow-2xl shadow-purple-500/20 z-50 transition-transform duration-300 ease-out ${
          isWarLogsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center">
              <AlertCircle size={15} className="text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Issues I Faced</h3>
              <p className="text-[10px] text-purple-400">real problems, real fixes · 72 hours of building</p>
            </div>
          </div>
          <button
            onClick={() => setIsWarLogsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Content - Scrollable Logs */}
        <div className="h-[calc(100%-80px)] overflow-y-auto p-4 space-y-2">
          <div className="text-[10px] text-purple-400/70 mb-3 font-mono border-b border-purple-500/20 pb-2">
            {"// every error, bug, and late-night fix that got us here"}
          </div>
          {warLogs.map((log, idx) => (
            <div
              key={idx}
              className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-purple-500/10 transition-all border border-transparent hover:border-purple-500/30"
            >
              <span className="text-xs text-purple-400 font-mono mt-0.5">#{idx + 1}</span>
              <p className="text-xs text-slate-300 font-mono leading-relaxed flex-1">
                {log}
              </p>
              <span className="text-[10px] text-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                🐞
              </span>
            </div>
          ))}
          
          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-purple-500/20 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              built with ❤️ + caffeine + pure stubbornness
            </p>
            <p className="text-[9px] text-purple-600/50 mt-1">
              bugs smashed: {warLogs.length} | nights slept: 1.5
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          CAMPAIGN HISTORY DRAWER
          ============================================================ */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-black/95 backdrop-blur-xl border-l border-emerald-500/30 shadow-2xl shadow-emerald-500/10 z-50 transition-transform duration-300 ease-out ${
          isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <BarChart3 size={15} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Campaign History</h3>
              <p className="text-[10px] text-emerald-400">{pastCampaigns.length} campaigns launched this session</p>
            </div>
          </div>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="h-[calc(100%-80px)] overflow-y-auto p-4 space-y-3">
          {pastCampaigns.map((c, idx) => {
            const isActive = c.id === campaign?.id;
            const a = c.analytics;
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isActive
                    ? "border-emerald-500/40 bg-emerald-950/30"
                    : "border-slate-800/70 bg-slate-900/40"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{c.goalText}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {isActive && (
                      <span className="text-[9px] bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Live</span>
                    )}
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider border",
                      CHANNEL_COLORS[c.chosenChannel]
                    )}>{c.chosenChannel}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: "Targeted", value: c.audience.estimatedSize },
                    { label: "Delivered", value: a?.delivered ?? "—" },
                    { label: "Opened", value: a?.opened ?? "—" },
                    { label: "Clicked", value: a?.clicked ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {a && (
                  <div className="mt-2.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(a.deliveryRate * 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-[9px] text-slate-600 font-mono mt-1.5">
                  {new Date(c.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  {a ? ` · ${Math.round(a.deliveryRate * 100)}% delivery` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2026 Welcome Modal for first-time users */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in">
          <div className="relative w-full max-w-lg mx-4 bg-slate-950/90 border border-purple-500/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-xl animate-slide-up">
            {/* Ambient background glow inside the modal */}
            <div className="absolute top-0 left-1/2 w-48 h-48 bg-purple-600/10 rounded-full blur-[60px] -translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center relative z-10">
              {/* Brand mark */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center shadow-lg shadow-red-950/50 border border-red-400/20 mb-6 animate-bounce">
                <span className="text-3xl">🍓</span>
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                Welcome to AIRA
              </h2>
              <p className="text-sm text-purple-300 font-mono mb-4 text-[10px] tracking-widest uppercase">
                AI-Native Campaign Engine
              </p>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-sm">
                Type a campaign goal in plain English. AIRA picks the right customers, writes the messages, routes them through the best channel, and shows you live delivery results.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("aira_has_seen_welcome", "true");
                    setShowWelcomeModal(false);
                    setGuidedDemo(true);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white transition-all duration-200 shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Take the Guided Tour
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("aira_has_seen_welcome", "true");
                    setShowWelcomeModal(false);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-900/60"
                >
                  Skip — I'll type my own goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          DATA INGESTION PORTAL (Import Panel) - COMMENTED OUT
          ============================================================ */}
      {false && (
      <section className="border-t border-slate-900 bg-slate-950/40 backdrop-blur-sm py-10 px-4 md:px-8 select-none">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-900">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Data Ingestion Portal
              </h2>
              <p className="text-xs text-text-muted mt-1 font-mono">
                Paste or upload your customer list — AIRA uses it to segment, score, and target your campaign.
              </p>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400">
                Safe Limit: <span className="text-rose-400 font-bold">2,000 max</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400">
                Import Limit: <span className="text-purple-400 font-bold">100 cust / 500 ord</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 mt-6">
            {/* Dropdown for Brand Type */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
                Brand Vertical
              </label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
                disabled={isImporting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-sans transition-all"
              >
                <option value="beauty-brand">💄 Beauty Brand (₹500 - ₹3000)</option>
                <option value="fitness-brand">💪 Fitness Brand (₹800 - ₹2500)</option>
              </select>
            </div>

            {/* Input for Customer Count */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
                Customer Count (1 - 100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={importCustomerCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setImportCustomerCount(isNaN(val) ? 0 : val);
                }}
                disabled={isImporting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-mono transition-all"
              />
            </div>

            {/* Input for Orders Per Customer */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
                Orders / Customer (1 - 10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={importOrdersPerCustomer}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setImportOrdersPerCustomer(isNaN(val) ? 0 : val);
                }}
                disabled={isImporting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-mono transition-all"
              />
            </div>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isImporting || importCustomerCount < 1 || importCustomerCount > 100 || importOrdersPerCustomer < 1 || importOrdersPerCustomer > 10 || (importCustomerCount * importOrdersPerCustomer > 500)}
              className={cn(
                "w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2",
                isImporting
                  ? "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
              )}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-purple-400" />
                  <span>Ingesting Data...</span>
                </>
              ) : (
                <>
                  <span>📥 Ingest Brand Data</span>
                </>
              )}
            </button>
          </div>
          {importCustomerCount * importOrdersPerCustomer > 500 && (
            <p className="text-[10px] text-rose-400 mt-2 font-mono">
              Limit Exceeded: Max 500 total orders per import (current: {importCustomerCount * importOrdersPerCustomer}).
            </p>
          )}
        </div>
      </section>
      )}

      <MegaFooter />
      <AttributionBar />

      {/* ===== GUIDED DEMO SYSTEM ===== */}
      <GuidedDemoSystem
        isActive={guidedDemo}
        onStart={() => setGuidedDemo(true)}
        onClose={() => setGuidedDemo(false)}
        onDemoComplete={() => {
          setGuidedDemo(false);
          localStorage.setItem("aira_demo_seen", "true");
          localStorage.setItem("aira_has_seen_welcome", "true");
        }}
      />

      {/* Toast Notification Container in top right */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-[100] flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-fade-in max-w-sm",
          toast.type === "success"
            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
            : "bg-rose-950/80 border-rose-500/30 text-rose-100"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0",
            toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          )}>
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold tracking-tight font-mono">
              {toast.type === "success" ? "Import Successful" : "Import Failed"}
            </p>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors text-xs font-bold leading-none p-1"
          >
            ✕
          </button>
        </div>
      )}
      
    </div>
  );
}