"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const dim = size === "lg" ? "w-10 h-10 text-xl" : "w-8 h-8 text-base";
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center shadow-lg shadow-red-900/30 flex-shrink-0",
        dim
      )}
    >
      <span aria-hidden>🍓</span>
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
            Twelve production milestones shipped by a single developer — from
            natural-language planning to live telemetry on Vercel.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {BIGGEST_WINS.map((win, i) => (
            <div
              key={win.title}
              className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-purple-800/50 hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border border-slate-700 text-slate-500">
                  {win.tag}
                </span>
              </div>
              <p className="text-sm text-slate-200 font-medium leading-snug">
                <span className="text-slate-600 font-mono text-xs mr-1.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {win.title}
              </p>
            </div>
          ))}
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#ec4899] flex items-center justify-center text-4xl shadow-xl shadow-red-900/30 mb-4">
              <span aria-hidden>🍓</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-purple-700/60 text-purple-300 text-xs font-mono uppercase tracking-wider">
              Builder
            </span>
          </div>
          <div className="md:col-span-8 space-y-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Aira K. Salish
              </h2>
              <p className="text-slate-400 leading-relaxed">
                AI &amp; ML student and product builder passionate about creating
                technology that delivers real-world impact.
              </p>
            </div>
            <ul className="space-y-2">
              {experience.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">▸</span>
                  {item}
                </li>
              ))}
            </ul>
            <blockquote className="border-l-2 border-purple-600/60 pl-4 italic text-slate-400 text-sm leading-relaxed">
              &ldquo;Building AI agents and systems that bridge the gap between
              innovation and execution.&rdquo;
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AIRoadmapSection() {
  return (
    <section className="w-full py-12 md:py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-2">
            2025–2026 Roadmap
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            What&apos;s Next for AIRA
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Prioritized AI advancements that will close current gaps and unlock
            autonomous marketing for enterprise teams.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_ROADMAP.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 hover:border-indigo-800/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white leading-snug">
                  {item.title}
                </h3>
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border flex-shrink-0",
                    STATUS_STYLES[item.status]
                  )}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Known Limitations · {KNOWN_GAPS.length} gaps acknowledged
          </span>
          {open ? (
            <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
          )}
        </button>
        {open && (
          <div className="mt-3 px-4 py-4 rounded-xl border border-slate-800/40 bg-slate-950/30 animate-fade-in">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KNOWN_GAPS.map((gap) => (
                <li
                  key={gap}
                  className="text-xs text-slate-500 font-mono flex items-start gap-2"
                >
                  <span className="text-slate-700">—</span>
                  {gap}
                </li>
              ))}
            </ul>
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
        <span>AIRA · Demo mode · All data simulated</span>
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