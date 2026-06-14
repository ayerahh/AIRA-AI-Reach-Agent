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

import { useState, useRef, useCallback, useEffect } from "react";
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
import { CAMPAIGN_SUGGESTIONS, type CampaignSuggestion } from "@/lib/campaign-suggestions";
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
const EXAMPLE_GOALS = [
  "Re-engage customers who haven't bought in 90+ days with a personalized discount",
  "Drive repeat purchases from our Gold-tier members with an exclusive early access offer",
  "Convert first-time buyers into loyal customers by highlighting our loyalty programme",
  "Win back lapsed platinum customers before the end-of-season sale",
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
        "w-full text-left p-5 rounded-xl border transition-all duration-300 relative overflow-hidden group backdrop-blur-md",
        isChosen
          ? "border-purple-500/50 bg-purple-950/20 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30"
          : "border-slate-800/80 bg-slate-950/40 hover:border-purple-500/30 hover:bg-slate-900/60 hover:shadow-2xl hover:-translate-y-0.5"
      )}
    >
      {/* Dynamic light reflection line on hover */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isChosen ? (
            <div className="w-5 h-5 rounded-full bg-purple-500/25 border border-purple-400 flex items-center justify-center">
              <CheckCircle2 size={12} className="text-purple-300 flex-shrink-0" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-slate-800 group-hover:border-purple-500/50 flex-shrink-0" />
          )}
          <span className="text-sm font-bold text-white tracking-tight">
            {variant.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono",
              CHANNEL_COLORS[variant.channel]
            )}
          >
            <ChannelIcon size={9} className="inline mr-1 -mt-0.5" />
            {variant.channel}
          </span>
          <span className="text-xs text-emerald-400 font-mono font-bold">
            {formatPct(variant.predictedCtr)} Predicted CTR
          </span>
        </div>
      </div>

      {variant.subject && (
        <div className="text-xs text-text-muted mb-2 font-mono flex gap-1">
          <span>Subject:</span>
          <span className="text-indigo-300 font-medium truncate">{variant.subject}</span>
        </div>
      )}

      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-sans">
        {variant.body}
      </p>

      <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          Tone: <span className="text-slate-300 font-bold">{variant.tone}</span>
        </span>
        <span className="text-[9px] text-purple-400/80 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
          Click to inspect variant analytics ➔
        </span>
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

function getContextualCustomer(goalText: string, customers?: any[]) {
  const lower = goalText ? goalText.toLowerCase() : "";
  
  // Clean fallback list just in case the main 250-customer state array isn't accessible
  const backupList = [
    { name: "Rahul Sharma", city: "Mumbai", tier: "Gold", status: "Active", orderCount: 12, totalSpent: 12450 },
    { name: "Priya Nair", city: "Bangalore", tier: "Platinum", status: "VIP", orderCount: 34, totalSpent: 54900 },
    { name: "Amit Patel", city: "Ahmedabad", tier: "Standard", status: "At Risk", orderCount: 3, totalSpent: 4120 },
    { name: "Sneha Reddy", city: "Hyderabad", tier: "Platinum", status: "Active", orderCount: 18, totalSpent: 28750 },
    { name: "Vikram Singh", city: "Delhi", tier: "Gold", status: "Dormant", orderCount: 5, totalSpent: 18200 }
  ];

  // Use the provided array if it's passed down, otherwise fall back to our secure local dataset
  const activeDataset = customers && customers.length > 0 ? customers : backupList;
  
  if (!lower) return activeDataset[0];
  
  // Score each customer profile based on matching input keywords
  const scored = activeDataset.map((customer: any) => {
    let score = 0;
    const data = `${customer.name || ''} ${customer.city || ''} ${customer.tier || ''} ${customer.status || ''}`.toLowerCase();
    
    const keywords = ["cart", "vip", "gold", "platinum", "lapsed", "winback", "new", "launch", "aov", "cross"];
    keywords.forEach(kw => {
      if (lower.includes(kw) && data.includes(kw)) score += 10;
    });
    
    if (customer.tier && lower.includes(customer.tier.toLowerCase())) score += 15;
    
    return { customer, score };
  });
  
  const best = scored.sort((a: any, b: any) => b.score - a.score)[0];
  return best ? best.customer : activeDataset[0];
}
// (Unused DEMO_STEPS removed for GuidedDemoSystem integration)

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

  // Build War Logs Sidebar State
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

  // Build War Logs - Close sidebar with Escape key
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
    const filtered = CAMPAIGN_SUGGESTIONS.filter((suggestion) => {
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
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const toggleTheme = () => {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light-theme-active");
    } else {
      document.documentElement.classList.remove("light-theme-active");
    }
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
        insight: "Monitoring user telemetry signals…",
        path: "Awaiting active intent capture rules…",
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
          message: "Monitoring user telemetry signals… Awaiting active intent capture rules.",
          productLabel: "No SKU bound",
        },
        {
          type: "whatsapp",
          message: "Standing by for campaign intent routing configuration.",
          productLabel: "Channel idle",
        },
        {
          type: "sms",
          message: "Awaiting active intent capture rules from goal input stream.",
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
      <section data-tour="platform-takeover" className="w-screen h-screen min-h-screen bg-slate-950 relative flex flex-col justify-between items-center overflow-hidden p-8 md:p-16 border-t border-purple-500/10 z-10">
        
        {/* Deep Field Ambient Grid Mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#090d16_1px,transparent_1px),linear-gradient(to_bottom,#090d16_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-60 pointer-events-none" />

        {/* Center Premium Display Headers */}
        <div className="relative z-10 w-full text-center mt-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-rose-500/10 border border-purple-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-slate-400 font-bold">
              AI-Native Customer Reach Platform
            </span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase select-none bg-clip-text bg-gradient-to-b from-white via-white to-slate-700/40">
            AIRA
          </h1>
          
          <p className="text-xs font-mono text-slate-500 tracking-wide max-w-md mx-auto">
            Built for Xeno · Take-home Engineering Assignment <br />
          </p>
        </div>

        {/* Modular Navigation / Platform Capability Director Grid */}
        <div className="relative z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-900 pt-8 mt-auto text-center md:text-left">
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono font-bold text-purple-400 tracking-wider uppercase">Platform Core</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">Audience Studio</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">Campaigns Routing</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono font-bold text-rose-400 tracking-wider uppercase">AI Agent Stack</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">Reach Agent Layer</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">Segment Synthesis</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono font-bold text-indigo-400 tracking-wider uppercase">Resources</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">Telemetry Logs</p>
            <p className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer">System Manifest</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase">Context</p>
            <p className="text-[11px] font-mono text-slate-400">© 2026 AIRA Framework</p>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-tight">V1.0.0 Production</p>
          </div>
        </div>
      </section>

      {/* ── Ambient gradient ─────────────────────────────────────────────── */}
      
      {/* ── Ambient gradient ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.08) 0%, transparent 60%)",
        }}
      />

<div className="relative z-10 max-w-5xl mx-auto px-4">
      {/* Header Navbar */}
      <header className="flex items-center justify-between py-6 border-b border-slate-900/60 relative z-20">
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
              {userName ? (
                <>
                  <span className="text-sm text-text-secondary flex items-center gap-1">
                    <span>👤</span> {userName}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors"
                    title="Edit name"
                  >
                    ✎
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

      

  {/* ============================================================
      ONE PROMPT, FULL CAMPAIGN CORE HEADER + VIDEO LAYER
      ============================================================ */}
  <div className="w-full my-12 animate-fade-in">
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-purple-400 uppercase">AI-Native Campaign Engine · Xeno Take-Home</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
        One Prompt, <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Full Campaign</span>
      </h1>
      <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Describe your target business goals in natural language. AIRA immediately parses parameters, 
        models customer segments, structures message copies, and configures real-time telemetry pipelines automatically.
      </p>
    </div>
    
    {/* ============================================================
        PREMIUM CHASSIS LIVE ANIMATION DECK (Direct Core Track)
        ============================================================ */}
    <div className="rounded-xl overflow-hidden border border-purple-500/30 bg-black shadow-2xl max-w-4xl mx-auto mt-8 transition-all duration-300 hover:border-purple-500/50">
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
      // SYSTEM STREAM LIVE TELEMETRY LOOP
    </p>
    
  </div>

  {/* ============================================================
      AI BUSINESS ONBOARDING PORTAL (Inputs, Intelligence Report)
      ============================================================ */}
  {(isIdle || isThinking) && (
    <BusinessOnboardingPortal onImportSuccess={setImportResult} />
  )}

  {(isIdle || isThinking) && importResult && (
    <TopCustomerSpotlight importResult={importResult} />
  )}

{/* ——— VIEWPORT 3: Goal Input Section ——— */}
{(isIdle || isThinking) && (
  <section data-tour="goal-input" className="mb-8 animate-slide-up delay-100">
    
    {/* MAIN SECTION LABEL */}
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 px-4 py-1.5 rounded-full mb-3">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-[11px] font-mono tracking-wider text-purple-300 uppercase font-bold">Main Engine</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white">
        Campaign <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Goal</span>
      </h2>
      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        Type your objective — AIRA handles the rest
      </p>
    </div>
    
    {/* Main Input Text Box - BIGGER & MORE PROMINENT */}
    <div className={cn(
      "relative rounded-2xl border-2 transition-all duration-300 bg-slate-950/60 p-6",
      isThinking
        ? "border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
        : "border-purple-500/30 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]"
    )}>
      
      <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-widest mb-3">
        <span className="text-base">🧠</span> 
        <span>TRY AIRA - ENTER YOUR CAMPAIGN GOAL  </span>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse ml-1" />
      </div>

      <textarea
        ref={textareaRef}
        value={goalText}
        onChange={(e) => handleTextareaChange(e.target.value)}
        placeholder="Example: 'Re-engage customers who haven't purchased in 90 days with a 20% off personalized win-back offer'"
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
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
        <div className="flex gap-2 flex-wrap">
          {isIdle &&
            EXAMPLE_GOALS.slice(0, 2).map((eg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTextareaChange(eg)}
                className="text-xs text-slate-400 hover:text-purple-300 border border-slate-700 hover:border-purple-500 rounded-full px-3 py-1.5 transition-all"
              >
                {eg.slice(0, 38)}…
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
            ? "text-white glow-accent hover:scale-[1.02] active:scale-[0.98]"
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
            <span className="text-base">AIRA is thinking...</span>
          </>
        ) : (
          <>
            <Zap size={22} className="text-purple-300" />
            <span className="text-base">Run AIRA</span>
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
          {dropdownMatches.length} matching parameters found • Use ↑ ↓ Enter
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

{/* ── VIEWPORT 2: Live Horizontal Pipeline Diagram Architecture ── (COMMENTED OUT) */}
{false && (
<section data-tour="pipeline-diagram" className="min-h-[90vh] flex flex-col justify-center py-12 border-b border-slate-900/60 snap-start text-left">
  <div className="space-y-2 mb-8">
    <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live Pipeline Simulation Deck
    </h3>
    <p className="text-xs text-slate-500 font-mono">
      Contextual routing engine · {pipeline.engineStatus}
    </p>
    <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-600">
      <span>Target Segment Match: <span className="text-emerald-400">250 customers</span></span>
      <span>Flowchart Transaction Ingestion: <span className="text-indigo-400">1,200 orders</span></span>
    </div>
  </div>

  <div className="grid grid-cols-12 gap-3 lg:gap-4 items-stretch relative">
    {/* Connector rail */}
    <div className="hidden lg:block absolute top-1/2 left-[26%] right-[34%] h-px bg-gradient-to-r from-indigo-500/40 via-violet-400/60 to-emerald-400/40 -translate-y-1/2 pointer-events-none" />

    {/* Column A — Refactored Dynamic User Node */}
    <div className="col-span-12 lg:col-span-3 p-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm relative flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">User</p>
          <span className="text-[9px] font-mono bg-purple-950/40 text-purple-400 border border-purple-900/30 px-1.5 py-0.5 rounded">Context Match</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] text-white border border-red-400/20 flex items-center justify-center font-bold text-lg shadow-lg shadow-red-900/40">
            {/* REMOVED ', customers' TO FIX SCOPE ERRORS */}
            {getContextualCustomer(goalText)?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">
              {getContextualCustomer(goalText)?.name || "Anonymous User"}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              {getContextualCustomer(goalText)?.city || "India"} · {getContextualCustomer(goalText)?.tier || "Standard"}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-[11px] font-mono text-slate-400 mb-4">
          <p>Lifetime Value: <span className="text-emerald-400 font-bold">₹{getContextualCustomer(goalText)?.totalSpent?.toLocaleString() || 0}</span></p>
          <p>Total Orders: <span className="text-indigo-300 font-bold">{getContextualCustomer(goalText)?.orderCount || 0} purchases</span></p>
          <p>Account Status: <span className="text-violet-300 uppercase text-[10px]">{getContextualCustomer(goalText)?.status || "Active"}</span></p>
        </div>
      </div>

      <div className="text-[10px] font-mono px-2 py-1.5 rounded-lg border border-amber-800/40 bg-amber-950/30 text-amber-300 mt-auto">
        Insight: Dynamic segment match verified from 250-row cohort tracking matrix.
      </div>
      
      {/* Structural layout connection point node */}
      <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-violet-500/80 border-2 border-slate-950 -translate-y-1/2 z-10" />
    </div>

    {/* Column B — Behavior Timeline & Insights */}
    <div className="col-span-12 lg:col-span-3 p-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm relative space-y-4">
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Behavior Track</p>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Audience Insights</p>
        <ul className="space-y-1.5">
          {pipeline.insights.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
              <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase mb-3">Behavior Timeline</p>
        <div className="space-y-3">
          {pipeline.timeline.map((tick, i) => (
            <div key={tick.label} className="flex items-start gap-2 relative">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-indigo-900" />
                {i < pipeline.timeline.length - 1 && (
                  <div className="w-px h-6 bg-indigo-800/60 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-200 font-mono leading-tight">{tick.label}</p>
                <p className="text-[9px] text-slate-500 font-mono">{tick.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-violet-500/80 border-2 border-slate-950 -translate-y-1/2 z-10" />
    </div>

    {/* Column C — AIRA Decision Layer Core */}
    <div className="col-span-12 lg:col-span-2 flex flex-col items-center justify-center p-4 relative">
      <div className="relative w-full max-w-[140px] aspect-square flex items-center justify-center">
        {/* Breathing ambient halo */}
        <div className="absolute top-1/2 left-1/2 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl animate-breathing-aura" />
        
        {/* Outer Rotating Dotted Ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/30 animate-spin-slow" />
        
        {/* Middle Rotating Segmented Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-double border-violet-400/40 animate-spin-reverse-slow" />
        
        {/* Inner static border */}
        <div className="absolute inset-4 rounded-full border border-fuchsia-500/20" />
        
        {/* Core glowing orb */}
        <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.45)] border border-white/15 hover:scale-105 transition-transform duration-300 cursor-pointer">
          <Brain size={28} className="text-white animate-pulse" />
        </div>
      </div>
      <p className="mt-4 text-[10px] font-mono text-center text-indigo-300 uppercase tracking-wider leading-relaxed">
        AIRA Decision<br />Layer Core
      </p>
      <p className="mt-1 text-[9px] font-mono text-slate-500 text-center max-w-[120px]">
        {pipeline.engineStatus}
      </p>
      <div className="hidden lg:flex absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-emerald-500/80 border-2 border-slate-950 -translate-y-1/2 z-10" />
    </div>

    {/* Column D — Channel Destination Stack */}
    <div className="col-span-12 lg:col-span-4 p-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm space-y-3">
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Channel Destinations</p>
      {pipeline.channels.map((card) => {
        const Icon = card.type === "email" ? Mail : card.type === "whatsapp" ? Send : Phone;
        const colorClass =
          card.type === "email"
            ? "border-blue-800/50 bg-blue-950/30"
            : card.type === "whatsapp"
            ? "border-emerald-800/50 bg-emerald-950/30"
            : "border-green-800/50 bg-green-950/30";
        const labelClass =
          card.type === "email"
            ? "text-blue-300"
            : card.type === "whatsapp"
            ? "text-emerald-300"
            : "text-green-300";
        return (
          <div key={card.type} className={cn("rounded-xl border p-3", colorClass)}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-[10px] font-mono uppercase font-bold flex items-center gap-1", labelClass)}>
                <Icon size={11} />
                {card.type}
              </span>
              <div className="w-10 h-10 rounded-lg border border-white/10 bg-slate-900/60 flex items-center justify-center text-[8px] font-mono text-slate-500 text-center leading-tight px-1">
                {card.productLabel}
              </div>
            </div>
            <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
              &ldquo;{card.message}&rdquo;
            </p>
          </div>
        );
      })}
    </div>
  </div>
</section>
)}

{/* Deep immersion space transition padding to clear fold layers before goal panel */}
<div className="h-[20vh] w-full" />


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

        {/* ── Analytics & Live Telemetry Results ───────────────────────────── */}
        {isResults && analytics && (
          <section className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-success/20 flex items-center justify-center">
                <BarChart3 size={13} className="text-success" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Campaign Results
              </h2>
              <span className="ml-2 text-xs bg-success/10 border border-success/20 text-success px-2.5 py-0.5 rounded-full">
                Active
              </span>
            </div>

            {/* Asynchronous Live Network Callback Monitor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider pl-1">
                <TerminalIcon size={12} className="text-amber-500" />
                Live Network Telemetry Stream
              </div>
              <CallbackTerminal
                isCampaignActive={isResults}
                matchedCustomerIds={campaign?.audience?.matchedCustomerIds || []}
              />
            </div>

            {/* Structured Analytics Metric Panes */}
            <div className="w-full">
              <AnalyticsPanel analytics={analytics} />
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
              className="w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-accent via-indigo-500 to-violet-600 hover:from-accent-bright hover:via-indigo-400 hover:to-violet-500 text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] glow-accent flex items-center justify-center gap-2 border border-white/10 shadow-lg shadow-indigo-900/30"
            >
              <span aria-hidden>🚀</span>
              Approve & Ingest Telemetry Deployment Matrix
              <ArrowRight size={16} />
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
            className="w-full py-3 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-2 font-mono"
          >
            <span aria-hidden>🔄</span>
            Start Over with a New Campaign Goal
            <RefreshCw size={14} className="opacity-60" />
          </button>
        </section>
      )}

      {/* Ambient Theme Configuration Switch Toggle Button */}
      <div className="fixed top-24 right-4 z-50 pointer-events-auto">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-all shadow-2xl flex items-center justify-center font-mono text-sm"
          title="Toggle system interface layout theme mode"
        >
          {themeMode === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div data-tour="observability-stack">
        <TelemetryDashboard 
          currentCampaign={campaign}
          currentAnalytics={analytics}
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
        <KnownLimitationsSection />
      </div>

      {/* ============================================================
          SECTION 1: ULTRA-PREMIUM FULL-SCREEN BUILDER DOSSIER (100vh Takeover)
          ============================================================ */}
      <section className="w-full min-h-screen xl:h-screen bg-slate-950/80 relative flex flex-col justify-center items-center overflow-hidden py-16 px-4 md:px-12 border-t border-slate-900/80">
        
        {/* Decorative Grid Overlay with radial vignette fade */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Large Left Interactive Avatar Column */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
          <div className="relative group">
  <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-rose-500 to-indigo-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 animate-tilt" />
  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden shadow-2xl">
  <img 
  src="/aira-new.jpg" 
  alt="Aira K. Salish" 
  className="w-full h-full object-cover"
/>
  </div>
</div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] bg-purple-950/50 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-full uppercase font-bold">
                AI/ML Student
              </span>
              <p className="text-[10px] font-mono text-slate-500 mt-2">SRMIST · Dept of CSE (AI/ML)</p>
            </div>
          </div>

          {/* Expanded Rich Dossier Text Column — PUNCHY & SOPHISTICATED */}
          <div className="lg:col-span-8 space-y-6">
            {/* Ultra-Premium Header Terminal Interface */}
            <div className="border-b border-slate-900/80 pb-5 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Aira K Salish
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <p className="text-xs font-mono text-purple-400 font-bold tracking-[0.2em] uppercase">
                      System Operator // Intent Architect
                    </p>
                  </div>
                </div>
                
                {/* Meta ID Tag */}
                <div className="bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur-sm select-none">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block text-right">Operator Node</span>
                  <span className="text-[11px] font-mono text-slate-300 font-bold tracking-wide">RA2311026011017</span>
                </div>
              </div>
              
              {/* Premium Interactive Social Pill Navigation */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mr-2">Networks:</span>
                
                <a 
                  href="https://linkedin.com/in/airasalish" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-2.5 py-1 rounded-md font-mono text-[11px] text-slate-400 border border-slate-900 bg-slate-950/40 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-950/10 transition-all duration-200"
                >
                  linkedin
                </a>
                
                <a 
                  href="https://github.com/ayerahh" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-2.5 py-1 rounded-md font-mono text-[11px] text-slate-400 border border-slate-900 bg-slate-950/40 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-950/10 transition-all duration-200"
                >
                  github
                </a>
                
                <a 
                  href="https://instagram.com/aira.kivy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-2.5 py-1 rounded-md font-mono text-[11px] text-slate-400 border border-slate-900 bg-slate-950/40 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-950/10 transition-all duration-200"
                >
                  instagram
                </a>
              </div>
            </div>

            {/* Tightened High-Contrast Directory */}
            <ul className="space-y-2.5 font-mono text-xs text-slate-300 leading-relaxed max-w-3xl">
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Academic Track:</strong> B.Tech CSE student specializing in <span className="text-emerald-400/80">AI & ML</span> at SRMIST.
  </li>
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Leadership:</strong> Technical Lead (AI/ML) at <span className="text-rose-400/80">ACM Women (ACMW)</span>.
  </li>
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Industry Core:</strong> Former Prompt Engineering Intern at <span className="text-emerald-400/80">BabyBillion Pvt. Ltd.</span>
  </li>
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Executive Benchmarks:</strong> Worked under <span className="text-emerald-400/80">Dinesh Godara</span> (former VP at Unacademy, founder of BabyBillion).
  </li>
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Shipped Production:</strong> <span className="text-rose-400/80">Generative AI Researcher</span> for the Spotted app (founded by Amit Baradia).
  </li>
  <li>
    <span className="text-purple-500 font-bold mr-2">▪</span>
    <strong>Open Source & FinTech:</strong> Contributor via <span className="text-emerald-400/80">GSSoC</span> · Graduate of <span className="text-emerald-400/80">CitiBridge</span> Program 2026 by Citibank.
  </li>
</ul>
            {/* Vision Footer */}
            <div className="pt-3 border-t border-slate-900/60 text-slate-400 text-[11px] font-mono space-y-1">
              <div><span className="text-slate-600 mr-2">→</span><strong>Focus:</strong> Autonomous AI agents, intelligent automation, and failsafe tech layers.</div>
              <div><span className="text-slate-600 mr-2">→</span><strong>Vision:</strong> Engineering abstract concepts into products with real-world impact.</div>
            </div>

            <blockquote className="border-l-2 border-purple-500 bg-purple-950/10 rounded-r-xl px-4 py-2.5 italic text-xs text-slate-400 font-mono max-w-2xl">
              "Building AI agents and systems that bridge the gap between abstract innovation and deterministic execution."
            </blockquote>
          </div>

        </div>
      </section>

      

      {/* ============================================================
          FLOATING TOGGLE BUTTON (With Speech-Bubble Pointer Tail)
          ============================================================ */}
      <div className="fixed bottom-36 right-6 z-50 flex flex-row-reverse items-center gap-3">
        
        {/* The Core Floating Circle Button Asset */}
        <button
          onClick={() => setIsWarLogsOpen(!isWarLogsOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-rose-600 shadow-lg shadow-purple-500/30 hover:scale-110 transition-all duration-200 flex items-center justify-center group outline-none flex-shrink-0"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">📋</span>
        </button>

        {/* Descriptive Text Pill with a Right-Pointing Speech Tail */}
        <div className="relative bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-200 font-mono text-[11px] font-bold px-3 py-2 rounded-xl shadow-2xl tracking-tight select-none whitespace-nowrap animate-pulse">
          ⚡ See Errors / Problems Faced
          
          {/* ── THE CSS POINTER TAIL ── */}
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-slate-800">
            <div className="absolute top-1/2 left-[-7px] -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[5px] border-l-slate-950" />
          </div>
        </div>

      </div>

      {/* ============================================================
         COLLAPSIBLE RIGHT SIDEBAR - BUILD WAR LOGS
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
              <span className="text-sm">📋</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Build War Logs</h3>
              <p className="text-[10px] text-purple-400">30 battles · 72 hours · 1 winner</p>
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

      {/* 2026 Welcome Modal for first-time users */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in">
          <div className="relative w-full max-w-lg mx-4 bg-slate-950/90 border border-purple-500/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-xl animate-slide-up">
            {/* Ambient background glow inside the modal */}
            <div className="absolute top-0 left-1/2 w-48 h-48 bg-purple-600/10 rounded-full blur-[60px] -translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center relative z-10">
              {/* Brand mark */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center text-3xl shadow-lg shadow-red-950/50 border border-red-400/20 mb-6 animate-bounce">
                <span>🍓</span>
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                Welcome to AIRA
              </h2>
              <p className="text-sm text-purple-300 font-mono mb-4 text-[10px] tracking-widest uppercase">
                AI-Native Campaign Engine
              </p>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-sm">
                Describe your business goal in natural language. AIRA will automatically model customer segments, draft message copies, configure channels, and start real-time simulated telemetry logs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    setGuidedDemo(true);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white transition-all duration-200 shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  🚀 Yes, Start Guided Tour
                </button>
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    localStorage.setItem('aira_demo_seen', 'true');
                  }}
                  className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-900/60"
                >
                  No thanks, I'll write mine
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
                <span className="text-purple-500">⚡</span> Data Ingestion Portal
              </h2>
              <p className="text-xs text-text-muted mt-1 font-mono">
                Simulate bulk CRM imports for testing segment filters and telemetry logs.
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
              ⚠️ Exceeds limit: Max 500 total orders per import (current: {importCustomerCount * importOrdersPerCustomer}).
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