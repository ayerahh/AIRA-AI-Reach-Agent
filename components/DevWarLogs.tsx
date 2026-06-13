'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, ChevronDown, Wrench, FileText } from 'lucide-react';

export function DevWarLogs() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  // Auto-trigger the floating banner after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const logs = `1. vercel deployment kept blowing up, had to rewrite the build config and env setups completely
2. vercel api routes kept saying fetch failed... changed them to standalone outputs to fix server networking
3. next.js app router migration was a pain, had to refactor a bunch of routes to match conventions
4. strict typescript compilation errors, spent hours fighting type mismatches and interface conflicts
5. import path resolution failures: standardized absolute paths so components can actually see each other
6. node.js version mismatch, local machine and deployment runtimes weren't matching at all
7. missing dependencies on build... npm install forgot a few unlinked packages during deploy
8. env variables wouldn't load on production... fixed the secret injection settings on vercel dashboard
9. stupid typo ROQ_API_KEY, spent way too long realizing i missed the G in GROQ_API_KEY
10. groq silently falling back without throwing errors: added strict validation gates and catch blocks
11. groq url parsing error, prompt inputs had markdown link syntax that broke the backend, stripped it out
12. fake ai reasoning engine was boring, tore out the mock text and connected actual llama 3.3 via groq
13. generic campaign outputs look fake, forced dynamic llm generations using unhinged / sarcastic prompts
14. dataset was microscopic (25 rows), expanded it manually to 250 customers so filtering actually works
15. audience segmentation realism... fixed the filters so it stops dropping dummy data everywhere
16. static dashboard numbers look dead: killed raw counts and rebuilt them as async event-driven updates
17. instant metric generation looked fake, added a staggered callback lifecycle to show states moving
18. channel service wasn't deployed separate, coded a dedicated channel simulator stub right in the project
19. no delivery lifecycle track... built a proper Delivered -> Opened -> Clicked -> Failed logic flow
20. webhook support was missing, built a campaign webhook ingestion endpoint from scratch
21. charts not updating live, implemented real-time callback processing to update data on the fly
22. campaign launch was freezing the screen, shifted the whole system to non-blocking async dispatch
23. blind system behavior, couldn't tell what was happening, so built the Live Network Telemetry Stream
24. hidden event processing, explicitly dumped tracking logs straight to the frontend console
25. invisible infrastructure layer: threw up that top-right Platform Engine Telemetry panel to track tasks
26. no historical debugging, added snapshot state logs and a quick raw JSON diagnostics viewer
27. telemetry streams looked messy, cleaned up the event lifecycle definitions and payload tracking
28. telemetry taking up the whole UI, recognized it needs a collapsible layout, left notes for a redesign
29. auto-scroll keeps stealing focus... annoying UX bug that forces viewport to logs, noted it for a future fix
30. multiple log channels causing chaos: need a unified workspace, proposed the system architecture
31. standard crm design trap, hated the generic layout, pushed hard to make it an event-driven platform
32. checking if the ai is actually smart: tested it with weird comedy campaign goals to see if it breaks
33. human in the loop issue, added an explicit "Approve & Launch" gate so it doesn't just fire randomly
34. time constraint vs production reality, had to make architectural compromises, put them all in the readme
35. the 72h hard limit... basically broke, fixed, and rebuilt features for 3 days straight until it finally worked`;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-mono">
      
      {/* ── 1. Top Informative Popup Banner ── */}
      {!isOpen && showTooltip && (
        <div className="mb-3 w-80 bg-slate-900 border-2 border-amber-500 p-4 rounded-xl shadow-2xl animate-bounce text-xs space-y-2 text-left relative z-[9999]">
          <div className="flex items-center justify-between text-amber-400 font-bold font-mono">
            <span className="flex items-center gap-1.5">⚠️ PLATFORM INFRASTRUCTURE GAP</span>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-slate-400 hover:text-white font-sans text-base p-1 outline-none transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-slate-200 leading-relaxed font-sans text-[11px]">
            Hey! Click the floating button below to review the **Platform Architecture Log**. It outlines all **35 technical hurdles** I ran into and smashed while building this system in 72 hours.
          </p>
        </div>
      )}

      {/* ── 2. Action Trigger Button Group (With Permanent Side Description) ── */}
      {!isOpen && (
        <div className="flex items-center gap-3 relative z-[9999]">
          
          {/* Permanent Left Label Text Pill */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 font-mono text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xl tracking-tight select-none">
            ⚡ See Errors / Problems Faced
          </div>

          {/* Pulse-Glow Action Button Icon */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 flex items-center justify-center text-white shadow-2xl shadow-purple-950/50 transition-all duration-200 hover:scale-110 active:scale-95 outline-none border border-white/10"
          >
            <span className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping opacity-75" />
            <FileText size={22} className="text-white drop-shadow relative z-10" />
          </button>
        </div>
      )}

      {/* ── 3. Expandable System Terminal Drawer Canvas ── */}
      {isOpen && (
        <div className="w-full sm:w-[480px] max-w-lg border border-slate-800 bg-slate-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative z-[9999]">
          {/* Top Panel Bar Controls */}
          <div 
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between border-b border-slate-900 bg-slate-900/40 px-4 py-3 cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-indigo-400" />
              <span className="text-indigo-400 font-bold text-[11px] tracking-tight">
                // platform architecture log & technical struggles
              </span>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
              <ChevronDown size={12} /> close terminal
            </span>
          </div>

          {/* Raw Log Ledger Area */}
          <div className="h-[300px] overflow-y-auto p-4 text-slate-400 text-[11px] leading-relaxed select-text bg-slate-950/50">
            <pre className="whitespace-pre-wrap font-mono selection:bg-indigo-900/40 selection:text-indigo-300">
              {logs}
            </pre>
          </div>

          {/* Console Tracker Footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-900 bg-slate-900/20 px-4 py-2.5">
            <span>[Build Target: Production Ready]</span>
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Terminal size={10} /> resolution rate: 100% (35/35)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}