"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: "delivery" | "open" | "click" | "failure";
  message: string;
}

interface CallbackTerminalProps {
  isCampaignActive: boolean;
  campaignId: string | null;
  matchedCustomerIds: string[];
}

export default function CallbackTerminal({ isCampaignActive, matchedCustomerIds }: CallbackTerminalProps) {
  const [logs, setLogs] = useState<TelemetryEvent[]>([]);
  const terminalScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollBox = terminalScrollContainerRef.current;
    if (!scrollBox) return;
    const isAtBottom = scrollBox.scrollHeight - scrollBox.scrollTop <= scrollBox.clientHeight + 60;
    if (isAtBottom) {
      scrollBox.scrollTo({ top: scrollBox.scrollHeight, behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (!isCampaignActive || matchedCustomerIds.length === 0) {
      if (!isCampaignActive) setLogs([]);
      return;
    }

    let isMounted = true;

    const initEvent: TelemetryEvent = {
      id: `sys-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "delivery",
      message: `System: Telemetry pipeline initialized. Dispatching campaign to ${matchedCustomerIds.length} customer records...`
    };
    setLogs([initEvent]);

    const generateStream = async () => {
      const targetIds = [...matchedCustomerIds].sort(() => Math.random() - 0.5);

      for (const id of targetIds) {
        if (!isMounted) break;

        await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 300));
        const isFailure = Math.random() < 0.05;

        const deliveryLog: TelemetryEvent = {
          id: `del-${id}-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: isFailure ? "failure" : "delivery",
          message: isFailure
            ? `Delivery failed for customer ${id.slice(0, 8)}`
            : `Message delivered to customer ${id.slice(0, 8)}`
        };

        if (isMounted) setLogs((prev) => [...prev, deliveryLog]);
        if (isFailure) continue;

        if (Math.random() > 0.3) {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 1200 + 400));
          const openLog: TelemetryEvent = {
            id: `open-${id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "open",
            message: `Customer ${id.slice(0, 8)} opened the message`
          };
          if (isMounted) setLogs((prev) => [...prev, openLog]);

          if (Math.random() > 0.4) {
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
            const clickLog: TelemetryEvent = {
              id: `click-${id}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: "click",
              message: `Customer ${id.slice(0, 8)} clicked the link — conversion tracked`
            };
            if (isMounted) setLogs((prev) => [...prev, clickLog]);
          }
        }
      }
    };

    generateStream();
    return () => { isMounted = false; };
  }, [isCampaignActive, matchedCustomerIds]);

  const handleClear = () => setLogs([]);

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 select-none">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-2 text-slate-400 text-[11px]">delivery-callbacks.log</span>
        </div>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <button onClick={handleClear} className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors">
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded bg-slate-950 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-800/60">
            <span>STATUS:</span>
            {isCampaignActive ? (
              <span className="text-amber-400 animate-pulse font-bold">STREAMING</span>
            ) : (
              <span className="text-slate-500">IDLE</span>
            )}
          </div>
        </div>
      </div>

      <div
        ref={terminalScrollContainerRef}
        className="h-64 overflow-y-auto p-4 space-y-2.5 bg-slate-950 text-slate-300"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-600 italic select-none text-center">
            Launch a campaign to see delivery events here.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 border-l-2 pl-2 border-slate-800 hover:bg-slate-900/40 py-0.5 transition-colors">
              <span className="text-slate-600 select-none">[{log.timestamp}]</span>
              <span className={`font-semibold shrink-0 select-none ${
                log.type === "click" ? "text-emerald-400" :
                log.type === "open" ? "text-sky-400" :
                log.type === "failure" ? "text-rose-400" : "text-amber-400"
              }`}>
                {log.type.toUpperCase()}
              </span>
              <span className={log.type === "click" ? "text-emerald-200 font-medium" : "text-slate-300"}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
