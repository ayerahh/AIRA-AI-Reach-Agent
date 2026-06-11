"use client";

/**
 * AIRA — AI Reach Agent
 * Main application page.
 *
 * Flow:
 *  1. User types a natural-language campaign goal
 *  2. Client POSTs to /api/agent/run (→ server fakes AI reasoning)
 *  3. Agent thinking panel animates through steps in real-time (SSE-ready,
 *     currently polls via optimistic UI with local step progression)
 *  4. Results appear: audience segment, message variants, chosen channel
 *  5. User approves → POST /api/campaigns/launch → analytics surface
 */

import { useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { cn, formatINR, formatPct } from "@/lib/utils";
import type {
  Campaign,
  AgentStep,
  MessageVariant,
  CampaignChannel,
  CampaignAnalytics,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppPhase =
  | "idle"           // waiting for goal input
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
    detail: "Scanning 25 customers × purchase history, engagement scores, and recency signals…",
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
const EXAMPLE_GOALS = [
  "Re-engage customers who haven't bought in 90+ days with a personalized discount",
  "Drive repeat purchases from our Gold-tier members with an exclusive early access offer",
  "Convert first-time buyers into loyal customers by highlighting our loyalty programme",
  "Win back lapsed platinum customers before the end-of-season sale",
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("thinking-dot w-1 h-1 rounded-full bg-accent-bright")}
        />
      ))}
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
        "flex items-start gap-3 py-3 px-4 rounded-xl transition-all duration-500",
        isActive && "bg-accent/10 border border-accent/20",
        isDone && "opacity-60",
        isPending && "opacity-30"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300",
          isDone && "bg-success/20 text-success",
          isActive && "bg-accent/20 text-accent-bright",
          isPending && "bg-surface-3 text-text-muted"
        )}
      >
        {isDone ? (
          <CheckCircle2 size={14} />
        ) : isActive ? (
          <div className="w-2 h-2 rounded-full bg-accent-bright animate-pulse" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-text-muted" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isActive ? "text-text-primary" : "text-text-secondary"
            )}
          >
            {step.label}
          </span>
          {isActive && <ThinkingDots />}
        </div>
        {isActive && (
          <p className="text-xs text-text-muted mt-0.5 animate-fade-in">
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
        "bg-surface-2 border border-border rounded-xl p-4 animate-slide-up",
        `delay-${delay}`
      )}
    >
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={cn("text-2xl font-bold", colorMap[color])}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

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

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200 group",
        isChosen
          ? "border-accent bg-accent/10 ring-1 ring-accent/30"
          : "border-border bg-surface-2 hover:border-border-bright hover:bg-surface-3"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isChosen && (
            <CheckCircle2 size={14} className="text-accent-bright flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-text-primary">
            {variant.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border",
              CHANNEL_COLORS[variant.channel]
            )}
          >
            <ChannelIcon size={10} className="inline mr-1" />
            {variant.channel}
          </span>
          <span className="text-xs text-success font-mono">
            {formatPct(variant.predictedCtr)} CTR
          </span>
        </div>
      </div>

      {variant.subject && (
        <p className="text-xs text-text-muted mb-1 font-medium">
          Subject: <span className="text-text-secondary">{variant.subject}</span>
        </p>
      )}

      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
        {variant.body}
      </p>

      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs text-text-muted capitalize">
          Tone: {variant.tone}
        </span>
      </div>
    </button>
  );
}

function AnalyticsPanel({ analytics }: { analytics: CampaignAnalytics }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top-line metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Targeted"
          value={analytics.totalTargeted.toString()}
          sub="customers in segment"
          delay={100}
        />
        <MetricCard
          label="Delivered"
          value={analytics.delivered.toString()}
          sub={formatPct(analytics.deliveryRate) + " rate"}
          color="success"
          delay={200}
        />
        <MetricCard
          label="Open Rate"
          value={formatPct(analytics.openRate)}
          sub={`${analytics.opened} opened`}
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Run the agent (POST → /api/agent/run) ──────────────────────────────────

  const runAgent = useCallback(async () => {
    if (!goalText.trim() || phase !== "idle") return;

    setError(null);
    setPhase("thinking");
    setCurrentStepIndex(0);
    setCampaign(null);
    setAnalytics(null);

    // Animate through local thinking steps while the server works
    let stepIdx = 0;
    const advanceStep = () => {
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
        body: JSON.stringify({ goalText: goalText.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Agent failed to process your goal.");
      }

      // Wait until UI finishes last step animation
      const totalAnimTime = STEP_DURATIONS.reduce((a, b) => a + b, 0);
      const elapsed = Date.now();
      const remaining = totalAnimTime - (Date.now() - elapsed);
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
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // ── Copy message body ──────────────────────────────────────────────────────

  const copyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-canvas bg-grid">
      {/* ── Ambient gradient ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 pb-24">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright text-xs font-medium mb-6">
            <Sparkles size={12} />
            AI-Native Campaign Engine · Xeno Take-Home
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3">
            <span className="gradient-text">AIRA</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-md mx-auto">
            AI Reach Agent — describe your goal in plain English and watch AIRA
            build, segment, and launch your campaign.
          </p>
        </header>

        {/* ── Goal Input Section ───────────────────────────────────────────── */}
        {(isIdle || isThinking) && (
          <section className="mb-8 animate-slide-up delay-100">
            <div
              className={cn(
                "relative rounded-2xl border transition-all duration-300",
                isThinking
                  ? "border-accent/40 bg-surface glow-accent"
                  : "border-border bg-surface hover:border-border-bright"
              )}
            >
              {/* Header row */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-border">
                <Brain size={16} className="text-accent-bright" />
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Campaign Goal
                </span>
                {isThinking && (
                  <span className="ml-auto text-xs text-accent-bright flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
                    Agent thinking
                  </span>
                )}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                disabled={isThinking}
                placeholder="Describe your campaign goal in natural language…&#10;&#10;e.g. Re-engage customers who haven't bought in 90 days with a personalized win-back offer"
                rows={5}
                className={cn(
                  "w-full bg-transparent px-4 py-3 text-text-primary placeholder-text-muted",
                  "resize-none outline-none text-base leading-relaxed",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    runAgent();
                  }
                }}
              />

              {/* Footer row */}
              <div className="flex items-center justify-between px-4 pb-4 pt-1">
                <div className="flex gap-2 flex-wrap">
                  {isIdle &&
                    EXAMPLE_GOALS.slice(0, 2).map((eg, i) => (
                      <button
                        key={i}
                        onClick={() => setGoalText(eg)}
                        className="text-xs text-text-muted hover:text-text-secondary border border-border hover:border-border-bright rounded-full px-2.5 py-1 transition-colors"
                      >
                        {eg.slice(0, 38)}…
                      </button>
                    ))}
                </div>
                <span className="text-xs text-text-muted">
                  ⌘↵ to run
                </span>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 animate-fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Run button */}
            <button
              onClick={runAgent}
              disabled={!goalText.trim() || isThinking}
              className={cn(
                "w-full mt-4 py-4 rounded-xl font-semibold text-base transition-all duration-200",
                "flex items-center justify-center gap-2",
                goalText.trim() && !isThinking
                  ? "bg-accent hover:bg-accent-bright text-white glow-accent hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-surface-2 text-text-muted cursor-not-allowed border border-border"
              )}
            >
              {isThinking ? (
                <>
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="thinking-dot w-2 h-2 rounded-full bg-accent-bright"
                      />
                    ))}
                  </span>
                  AIRA is thinking…
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Run AIRA Agent
                </>
              )}
            </button>
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
                    {isThinking ? "Agent Reasoning" : "Analysis Complete"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {isThinking
                      ? `Step ${Math.min(currentStepIndex + 1, THINKING_STEPS.length)} of ${THINKING_STEPS.length}`
                      : `${THINKING_STEPS.length} steps completed · ${
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
                    Agent Summary
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

        {/* ── Review Sections (Audience + Messages + Channel) ───────────────── */}
        {(isReview || isLaunching || isResults) && campaign && (
          <>
            {/* ── Suggested Audience ─────────────────────────────────────── */}
            <section className="mb-6 animate-slide-up">
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
                  Select a variant to use
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

            {/* ── Approve & Launch ─────────────────────────────────────── */}
            {isReview && (
              <div className="animate-slide-up delay-300">
                <button
                  onClick={launchCampaign}
                  className="w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-accent to-indigo-500 hover:from-accent-bright hover:to-indigo-400 text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] glow-accent flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Approve & Launch Campaign
                  <ArrowRight size={16} />
                </button>

                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-text-muted">
                  <span>Campaign: <span className="text-text-secondary font-medium">{campaign.name}</span></span>
                  <span>·</span>
                  <span>Audience: <span className="text-accent-bright font-medium">{campaign.audience.estimatedSize} customers</span></span>
                </div>

                {/* Edit goal link */}
                <button
                  onClick={reset}
                  className="w-full mt-3 py-2 text-sm text-text-muted hover:text-text-secondary flex items-center justify-center gap-1 transition-colors"
                >
                  <RefreshCw size={13} />
                  Start over with a new goal
                </button>
              </div>
            )}

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
                    Dispatching to Channel Service…
                  </p>
                  <p className="text-xs text-text-muted">
                    Queuing messages · Simulating delivery · Computing analytics
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Analytics Results ────────────────────────────────────────────── */}
        {isResults && analytics && (
          <section className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-success/20 flex items-center justify-center">
                <BarChart3 size={13} className="text-success" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Campaign Results
              </h2>
              <span className="ml-2 text-xs bg-success/10 border border-success/20 text-success px-2.5 py-0.5 rounded-full">
                Live
              </span>
            </div>

            <AnalyticsPanel analytics={analytics} />

            <button
              onClick={reset}
              className="w-full mt-6 py-3 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Run another campaign
            </button>
          </section>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 inset-x-0 border-t border-border bg-canvas/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            AIRA · Xeno Engineering Take-Home · In-memory demo
          </span>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              25 customers · 100 orders loaded
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
