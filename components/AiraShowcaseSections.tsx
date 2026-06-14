"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Cpu, CheckCircle2, Sparkles, Layers, Flag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BIGGEST_WINS = [
  { title: "Natural-language campaign planning", tag: "Core" },
  { title: "AI-powered audience segmentation", tag: "Core" },
  { title: "AI-generated message variants", tag: "Core" },
  { title: "Channel recommendation engine", tag: "Core" },
  { title: "Human-in-the-loop approval workflow", tag: "Shipped" },
  { title: "Asynchronous callback architecture", tag: "Shipped" },
  { title: "Webhook ingestion pipeline", tag: "Shipped" },
  { title: "Real-time analytics dashboard", tag: "Shipped" },
  { title: "Live telemetry and observability", tag: "Shipped" },
  { title: "Groq + Llama 3.3 integration", tag: "AI" },
  { title: "Successful Vercel deployment", tag: "Infra" },
  { title: "End-to-end AI marketing agent in 3 days", tag: "Milestone" },
];

const AI_ROADMAP = [
  {
    title: "Agentic Multi-Agent Workflows",
    status: "Prototype" as const,
    description:
      "Specialized segment, copy, channel, and analytics agents collaborate autonomously to plan and launch campaigns.",
  },
  {
    title: "Real-time Voice-to-Campaign",
    status: "Coming Soon" as const,
    description:
      "Speak campaign goals aloud — Groq Whisper + realtime APIs convert voice into live campaign briefs instantly.",
  },
  {
    title: "Reasoning Models for Strategy",
    status: "Planning" as const,
    description:
      "Chain-of-thought and tree-of-thought reasoning for deeper multi-step campaign strategy beyond single prompts.",
  },
  {
    title: "Self-Improving Feedback Loops",
    status: "Planning" as const,
    description:
      "Campaign results feed back into model tuning so each launch improves segmentation and copy quality.",
  },
  {
    title: "Autonomous A/B Testing",
    status: "Coming Soon" as const,
    description:
      "AI designs, runs, and declares test winners without manual intervention — faster creative iteration.",
  },
  {
    title: "Knowledge Graph Personalization",
    status: "Prototype" as const,
    description:
      "Semantic links between customers, products, and campaigns power real-time next-best-action recommendations.",
  },
];

const KNOWN_GAPS = [
  "No multi-modal input (text only)",
  "No voice interface for campaign creation",
  "No real-time collaboration (single user)",
  "No A/B testing automation",
  "No predictive send-time optimization",
  "No dynamic creative optimization (DCO)",
  "No cross-campaign learning / feedback loop",
  "No anomaly detection for campaign metrics",
  "No natural language search over customer data",
  "No explainable AI for segment decisions",
  "No automated cohort discovery",
  "No lookalike model training",
  "No real-time budget pacing",
  "No competitive intelligence ingestion",
];

const STATUS_STYLES = {
  Planning: "border-slate-700 bg-slate-900/60 text-slate-400",
  Prototype: "border-purple-800/60 bg-purple-950/40 text-purple-300",
  "Coming Soon": "border-indigo-800/60 bg-indigo-950/40 text-indigo-300",
};

function StrawberryLogo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const iconSize = size === "lg" ? 18 : 14;
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center shadow-lg shadow-red-950/50 flex-shrink-0 border border-red-400/20",
        dim
      )}
    >
      <Sparkles size={iconSize} className="text-white animate-pulse" />
    </div>
  );
}

export function AchievementsSection() {
  return (
    <section className="w-full py-12 md:py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-2">
            Biggest Wins
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Built in 72 Hours
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Twelve milestones shipped by a single developer — from natural-language planning to live telemetry.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {BIGGEST_WINS.map((win, i) => {
            const isCore = win.tag === "Core";
            const isShipped = win.tag === "Shipped";
            const isAI = win.tag === "AI";
            const isInfra = win.tag === "Infra";
            
            const borderClass = isCore
              ? "border-l-2 border-l-purple-500 hover:border-purple-400"
              : isShipped
              ? "border-l-2 border-l-emerald-500 hover:border-emerald-400"
              : isAI
              ? "border-l-2 border-l-cyan-500 hover:border-cyan-400"
              : isInfra
              ? "border-l-2 border-l-orange-500 hover:border-orange-400"
              : "border-l-2 border-l-amber-500 hover:border-amber-400";

            const Icon = isCore
              ? Cpu
              : isShipped
              ? CheckCircle2
              : isAI
              ? Sparkles
              : isInfra
              ? Layers
              : Flag;

            const statusText = isCore
              ? "Platform"
              : isShipped
              ? "Active"
              : isAI
              ? "LLM Node"
              : isInfra
              ? "Vercel"
              : "Goal";

            const statusColor = isCore
              ? "text-purple-400"
              : isShipped
              ? "text-emerald-400"
              : isAI
              ? "text-cyan-400"
              : isInfra
              ? "text-orange-400"
              : "text-amber-400";

            return (
              <div
                key={win.title}
                className={cn(
                  "group rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:-translate-y-1 hover:shadow-[0_4px_25px_rgba(168,85,247,0.06)] transition-all duration-300 flex flex-col justify-between min-h-[110px]",
                  borderClass
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border border-slate-800 text-slate-500 bg-slate-950/40">
                    {win.tag}
                  </span>
                  <Icon size={12} className={statusColor} />
                </div>
                <p className="text-sm text-slate-200 font-medium leading-snug flex-1">
                  <span className="text-slate-600 font-mono text-xs mr-1.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {win.title}
                </p>
                <div className="flex justify-end mt-2 pt-1 border-t border-slate-900/30">
                  <span className={cn("text-[8.5px] font-mono uppercase tracking-wider", statusColor)}>
                    ● {statusText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AboutBuilderSection() {
  const experience = [
    "Prompt Engineering Intern at BabyBillion Pvt. Ltd., Bangalore",
    "Contributor to the Spotted app",
    "Participant in GirlScript Summer of Code (GSSoC)",
    "Graduate of CitiBridge Training Program by Citibank",
  ];

  return (
    <section className="w-full py-12 md:py-16 border-t border-white/5 bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="border border-slate-800 bg-slate-950/50 p-6 md:p-8 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center shadow-xl shadow-red-900/30 mb-4">
                <Cpu className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 items-center md:items-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-950 bg-emerald-950/20 text-emerald-400 text-xs font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SYSTEM OPERATOR
                </span>
                <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                  NODE ID: <span className="text-purple-400">0x41697261</span>
                </span>
              </div>
            </div>
            <div className="md:col-span-8 space-y-5">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-sans tracking-tight">
                  Aira K. Salish
                </h2>
                <p className="text-slate-400 leading-relaxed font-sans text-sm md:text-base">
                  AI &amp; ML student and product builder passionate about creating
                  technology that delivers real-world impact.
                </p>
              </div>
              <ul className="space-y-2">
                {experience.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs md:text-sm text-slate-300 font-mono"
                  >
                    <span className="text-purple-500 mt-0.5 flex-shrink-0 select-none">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-2 border-purple-500/50 pl-4 italic text-slate-400 text-sm leading-relaxed font-sans">
                &ldquo;Building AI agents and systems that bridge the gap between
                innovation and execution.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AIRoadmapSection() {
  return (
    <section className="w-full py-12 md:py-16 border-t border-white/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="mb-8">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-2">
            2026 Roadmap
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            What&apos;s Next for AIRA
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Prioritized AI advancements that will close current gaps and unlock
            autonomous marketing for enterprise teams.
          </p>
        </div>

        {/* Timeline track connector line */}
        <div className="absolute left-1/2 top-36 bottom-12 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/15 to-transparent hidden lg:block -translate-x-1/2" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {AI_ROADMAP.map((item) => {
            const isPlanning = item.status === "Planning";
            const isComing = item.status === "Coming Soon";
            const isProto = item.status === "Prototype";

            let badgeStyle = "";
            let cardStyle = "border-slate-800 bg-slate-950/50 hover:border-indigo-500/30";
            
            if (isPlanning) {
              badgeStyle = "border-dashed border-slate-700 bg-slate-900/30 text-slate-500";
              cardStyle = "border-slate-900 bg-slate-950/30 opacity-60 hover:opacity-100 hover:border-slate-700";
            } else if (isComing) {
              badgeStyle = "border-indigo-500/25 bg-indigo-950/40 text-indigo-300";
            } else if (isProto) {
              badgeStyle = "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30 text-purple-200";
            }

            return (
              <div
                key={item.title}
                className={cn(
                  "rounded-xl border p-5 transition-all duration-300 hover:-translate-y-0.5",
                  cardStyle
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-100 leading-snug font-sans">
                    {item.title}
                  </h3>
                  <span
                    className={cn(
                      "text-[8px] font-mono uppercase px-2 py-0.5 rounded border flex-shrink-0 flex items-center gap-1 font-bold",
                      badgeStyle
                    )}
                  >
                    {isComing && (
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const LIMITATION_GROUPS = [
  {
    title: "Interaction Limitations",
    items: [
      { text: "No multi-modal input (text only)", roadmap: false },
      { text: "No voice interface for campaign creation", roadmap: true },
      { text: "No real-time collaboration (single user)", roadmap: true }
    ]
  },
  {
    title: "Intelligence Constraints",
    items: [
      { text: "No explainable AI for segment decisions", roadmap: false },
      { text: "No automated cohort discovery", roadmap: false },
      { text: "No lookalike model training", roadmap: false },
      { text: "No cross-campaign learning / feedback loop", roadmap: true },
      { text: "No anomaly detection for campaign metrics", roadmap: false }
    ]
  },
  {
    title: "Operational Gaps",
    items: [
      { text: "No A/B testing automation", roadmap: true },
      { text: "No predictive send-time optimization", roadmap: false },
      { text: "No dynamic creative optimization (DCO)", roadmap: false },
      { text: "No real-time budget pacing", roadmap: false },
      { text: "No competitive intelligence ingestion", roadmap: false }
    ]
  }
];

export function KnownLimitationsSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full py-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-slate-800/60 bg-transparent hover:bg-slate-900/30 transition-colors text-left"
        >
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>Known Limitations</span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400">
              13 items acknowledged
            </span>
          </span>
          {open ? (
            <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
          )}
        </button>
        {open && (
          <div className="mt-4 p-5 rounded-xl border border-slate-800/40 bg-slate-950/30 animate-fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LIMITATION_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h4 className="text-[11px] font-bold font-mono text-purple-400 uppercase tracking-wider border-b border-slate-900 pb-1.5">
                    {group.title}
                  </h4>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.text}
                        className="text-xs text-slate-500 font-mono flex items-start justify-between gap-2 py-0.5"
                      >
                        <div className="flex gap-2 items-start">
                          <span className="text-slate-700 select-none">—</span>
                          <span className="leading-snug">{item.text}</span>
                        </div>
                        {item.roadmap && (
                          <span className="text-[8px] font-mono text-indigo-400 font-bold border border-indigo-900/40 bg-indigo-950/20 px-1.5 py-0.2 rounded shrink-0 whitespace-nowrap">
                            → Roadmap
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function MegaFooter() {
  return (
    <footer className="w-full bg-black text-white py-16 md:py-24 border-t border-white/5 relative z-30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <StrawberryLogo />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                AIRA
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              AI-Native Customer Reach Platform
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Built for Xeno · Take-home assignment
            </p>
            <span className="inline-flex mt-3 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 text-slate-500">
              Demo mode
            </span>
          </div>
          <div>
            <h4 className="text-slate-400 text-xs font-semibold uppercase mb-4">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Audience Studio
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Campaigns
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Analytics
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Journey Designer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-400 text-xs font-semibold uppercase mb-4">
              AI Agents
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Reach Agent
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Segment Agent
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Copy Agent
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Channel Agent
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-400 text-xs font-semibold uppercase mb-4">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Walkthrough
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-400 text-xs font-semibold uppercase mb-4">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Xeno Take-home
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 my-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            © 2026 AIRA — AI-Native CRM. Built for the Xeno Engineering
            take-home assignment.
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 text-slate-500 font-mono">
              <StrawberryLogo size="sm" />
              Aira K. Salish
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function AttributionBar() {
  return (
    <div className="w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-md fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span>AIRA · Import your own data or use the built-in demo datasets · all campaign logic runs live</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Groq Llama 3.3
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            250 customers · 1,200 orders loaded
          </span>
        </div>
      </div>
    </div>
  );
}