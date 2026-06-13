"use client";

import React, { useState, useEffect } from "react";
import { Database, Clock, Copy, Check, ChevronLeft, ChevronRight, History, Terminal } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import type { Campaign, CampaignAnalytics } from "@/lib/types";

interface TelemetryDashboardProps {
  currentCampaign: Campaign | null;
  currentAnalytics: CampaignAnalytics | null;
  onRestoreSnapshot: (campaign: Campaign, analytics: CampaignAnalytics | null) => void;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  goalText: string;
  campaign: Campaign;
  analytics: CampaignAnalytics | null;
}

export default function TelemetryDashboard({
  currentCampaign,
  currentAnalytics,
  onRestoreSnapshot,
}: TelemetryDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "json">("history");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("aira_execution_history");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (!currentCampaign) return;

    setHistory((prev) => {
      // Find the user's raw prompt text from the UI textarea if possible, or fallback to the engine name
      const rawPromptElement = document.querySelector("textarea") as HTMLTextAreaElement;
      const parsedGoal = rawPromptElement?.value?.trim() || currentCampaign.name || "Custom Generation Goal";

      if (prev.some((item) => item.campaign.id === currentCampaign.id)) {
        const updated = prev.map((item) => 
          item.campaign.id === currentCampaign.id ? { ...item, analytics: currentAnalytics } : item
        );
        localStorage.setItem("aira_execution_history", JSON.stringify(updated));
        return updated;
      }

      const newItem: HistoryItem = {
        id: currentCampaign.id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        goalText: parsedGoal,
        campaign: currentCampaign,
        analytics: currentAnalytics,
      };

      const newHistory = [newItem, ...prev].slice(0, 10); // Safe cache guard rail
      localStorage.setItem("aira_execution_history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, [currentCampaign, currentAnalytics]);

  const handleCopyJSON = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearHistory = () => {
    localStorage.removeItem("aira_execution_history");
    setHistory([]);
  };

  return (
    <>
      {/* Pinned Side Handle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-24 right-0 z-50 flex items-center gap-2 px-3 py-2.5 rounded-l-xl border border-r-0 border-slate-800 bg-slate-950 font-mono text-xs text-slate-400 hover:text-slate-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] pointer-events-auto",
          isOpen ? "transform -translate-x-[400px]" : "translate-x-0"
        )}
      >
        <Terminal size={14} className={cn("text-indigo-400", isOpen && "animate-pulse")} />
        <span className="hidden sm:inline font-semibold">Engine Console ({history.length})</span>
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Slide-out Sidebar Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-40 w-full max-w-[400px] border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between pointer-events-auto",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div 
          className="flex items-center gap-2 border-b border-slate-900 pb-3 select-none cursor-pointer hover:bg-slate-900/30 transition-all rounded-lg px-2 -mx-2 group"
          onClick={() => setIsOpen(false)}
        >
          <Terminal size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex-1">AIRA Observability Stack</h3>
          <span className="text-[9px] text-slate-600 font-mono opacity-60 group-hover:opacity-100 transition-opacity">← click to close</span>
        </div>

          {/* Tab Selection Row */}
          <div className="flex gap-2 bg-slate-900/40 p-1 rounded-xl border border-slate-800/40 select-none">
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all",
                activeTab === "history" ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold" : "text-slate-500 hover:text-slate-300 border border-transparent"
              )}
            >
              <Clock size={13} />
              History
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all",
                activeTab === "json" ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold" : "text-slate-500 hover:text-slate-300 border border-transparent"
              )}
            >
              <Database size={13} />
              JSON Payload
            </button>
          </div>

          {/* Main View Area */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-900">
            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl font-mono">
                  <h4 className="text-[11px] font-bold text-slate-300">⏱️ Time-Travel State Cache</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Click any cached prompt goal footprint below to instantly reload its exact audience filters, copy variants, and ROI parameters.
                  </p>
                </div>

                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="text-center font-mono text-slate-600 italic text-xs py-12">
                      No snapshots cached yet.
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onRestoreSnapshot(item.campaign, item.analytics)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border font-mono text-xs cursor-pointer transition-all flex flex-col gap-1.5",
                          currentCampaign?.id === item.id 
                            ? "bg-indigo-950/25 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]" 
                            : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:border-slate-700"
                        )}
                      >
                        <div className="text-[11px] text-slate-200 font-medium leading-normal line-clamp-2">
                          {item.goalText}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-900/60 pt-1.5 mt-0.5 text-[10px]">
                          <span className="text-slate-600">[{item.timestamp}] Snapshot</span>
                          {item.analytics && (
                            <span className="text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-950/40 rounded border border-emerald-900/40">
                              {formatINR(item.analytics.estimatedRevenue)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "json" && (
              <div className="space-y-3 h-full flex flex-col overflow-hidden font-mono">
                <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                  <h4 className="text-[11px] font-bold text-slate-300">{"{ } Structured LLM Payload Validation"}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    The raw, type-validated data structure returned by Llama 3.3. This contract guarantees reliable client component processing.
                  </p>
                </div>

                {currentCampaign ? (
                  <div className="relative flex-1 min-h-0">
                    <button
                      onClick={() => handleCopyJSON(JSON.stringify({ campaign: currentCampaign, analytics: currentAnalytics }, null, 2))}
                      className="absolute top-2 right-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 z-10"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <pre className="text-slate-400 text-[10px] overflow-auto max-h-[420px] p-3 bg-slate-950 border border-slate-900 rounded-xl selection:bg-indigo-500/30 scrollbar-thin scrollbar-thumb-slate-900">
                      <code>{JSON.stringify({ campaign: currentCampaign, analytics: currentAnalytics }, null, 2)}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-slate-600 italic text-xs py-12">
                    {"{ } Awaiting real-time pipeline output..."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer Operations */}
        <div className="border-t border-slate-900 pt-3 flex items-center justify-between font-mono text-[10px] select-none text-slate-600">
          <span>AIRA Protocol v1.2</span>
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-rose-500/70 hover:text-rose-400 hover:underline transition-colors">
              Clear Storage
            </button>
          )}
        </div>
      </div>
    </>
  );
}