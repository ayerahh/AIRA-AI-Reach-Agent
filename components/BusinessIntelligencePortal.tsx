"use client";

import React, { useState, useEffect } from "react";
import { 
  Database, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Users, 
  ChevronRight 
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import seasonalEvents from "@/lib/seasonalEvents.json";

interface Opportunity {
  id: string;
  title: string;
  size: number;
  revenuePotential: number;
  action: string;
  description: string;
}

export default function BusinessIntelligencePortal() {
  // Card 1: Ingestion parameters
  const [ingestBrand, setIngestBrand] = useState<"beauty-brand" | "fitness-brand">("beauty-brand");
  const [ingestCustCount, setIngestCustCount] = useState<number>(50);
  const [ingestOrdersPerCust, setIngestOrdersPerCust] = useState<number>(5);
  const [isImporting, setIsImporting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{
    customersAdded: number;
    ordersAdded: number;
    duplicatesSkipped: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Card 2: Seasonal telemetry calculation (Fixed June 14, 2026 context)
  const [activeSeason, setActiveSeason] = useState<any>(null);

  // Card 3: Opportunities telemetry
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingOpps, setIsLoadingOpps] = useState(false);

  // Determine season on mount
  useEffect(() => {
    const systemDate = new Date("2026-06-14"); // Current system context
    const day = systemDate.getDate();
    const month = systemDate.getMonth(); // 5 = June

    let detectedId = "regular-season";
    if (day >= 30 || day <= 5) {
      detectedId = "salary-day";
    } else if (day >= 24 && day <= 27) {
      detectedId = "black-friday";
    } else if (day >= 10 && day <= 15) {
      detectedId = "diwali";
    } else if (day === 28 || day === 29) {
      detectedId = "new-year";
    } else if (month === 3 || month === 4) {
      detectedId = "ipl-season";
    } else if (month === 5) {
      detectedId = "wedding-season";
    }

    const matched = seasonalEvents.find(s => s.id === detectedId) || {
      id: "regular-season",
      name: "Regular Season",
      multiplier: 1.0,
      tone: "standard, professional, direct",
      personas: ["Regular Customer"],
      rule: "Standard calendar days"
    };

    setActiveSeason(matched);
  }, []);

  // Fetch opportunities
  const fetchOpportunities = async (brand: string) => {
    setIsLoadingOpps(true);
    try {
      const res = await fetch(`/api/opportunities?brand=${brand}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error("Failed to load opportunities", err);
    } finally {
      setIsLoadingOpps(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(ingestBrand);
  }, [ingestBrand]);

  const handleIngest = async () => {
    setIsImporting(true);
    setSuccessBanner(null);
    setImportError(null);

    try {
      const response = await responseWithTimeout(
        fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: ingestBrand,
            customerCount: ingestCustCount,
            ordersPerCustomer: ingestOrdersPerCust,
          }),
        }),
        15000 // 15s timeout limit
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessBanner({
          customersAdded: data.customersAdded,
          ordersAdded: data.ordersAdded,
          duplicatesSkipped: data.duplicatesSkipped,
        });
        
        // Refresh opportunities lists
        fetchOpportunities(ingestBrand);

        // Safe delay reload to synchronize parent dashboard metrics
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } else {
        setImportError(data.error || "Failed to complete data ingestion.");
      }
    } catch (err: any) {
      setImportError(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  // Helper helper function to support fetch timeouts
  async function responseWithTimeout(promise: Promise<Response>, timeout: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Request timed out. In-memory generation took more than 15 seconds."));
      }, timeout);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  return (
    <section className="mb-12 border border-slate-800/80 rounded-2xl bg-slate-950/40 backdrop-blur-md p-6 select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-900">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Sparkles size={15} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Business Intelligence Portal</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">// REAL-TIME DATA CAPTURE AND SEASONAL ROI TELEMETRY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: Operational Ingestion Engine */}
        <div className="border border-slate-900 bg-slate-950/60 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono mb-4">
              <Database size={13} className="text-purple-400" />
              <span>CRM INGESTION DRIVE</span>
            </div>

            <div className="space-y-3.5 mb-5">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Brand Vertical</label>
                <select
                  value={ingestBrand}
                  onChange={(e) => setIngestBrand(e.target.value as any)}
                  disabled={isImporting}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  <option value="beauty-brand">💄 Beauty Brand (₹500 - ₹3000)</option>
                  <option value="fitness-brand">💪 Fitness Brand (₹800 - ₹2500)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Customers (1-100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={ingestCustCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setIngestCustCount(isNaN(val) ? 0 : val);
                    }}
                    disabled={isImporting}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 disabled:opacity-50 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Orders/Cust (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ingestOrdersPerCust}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setIngestOrdersPerCust(isNaN(val) ? 0 : val);
                    }}
                    disabled={isImporting}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 disabled:opacity-50 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            {ingestCustCount * ingestOrdersPerCust > 500 && (
              <p className="text-[9px] text-rose-400 font-mono mb-3">
                Limit Exceeded: Generated orders cannot exceed 500.
              </p>
            )}

            {successBanner && (
              <div className="mb-3.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 font-mono text-[10px] space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} /> Ingestion complete
                </div>
                <div>Added: {successBanner.customersAdded} | Orders: {successBanner.ordersAdded}</div>
                <div>Duplicates skipped: {successBanner.duplicatesSkipped}</div>
              </div>
            )}

            {importError && (
              <div className="mb-3.5 p-3 rounded-lg border border-rose-500/20 bg-rose-950/20 text-rose-300 font-mono text-[10px] flex items-start gap-1.5">
                <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <button
              onClick={handleIngest}
              disabled={isImporting || ingestCustCount < 1 || ingestCustCount > 100 || ingestOrdersPerCust < 1 || ingestOrdersPerCust > 10 || (ingestCustCount * ingestOrdersPerCust > 500)}
              className="w-full py-2.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
            >
              {isImporting ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-purple-200" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Ingest Brand Data</span>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: Dynamic Seasonal Telemetry */}
        <div className="border border-slate-900 bg-slate-950/60 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono mb-4">
              <Calendar size={13} className="text-purple-400" />
              <span>SEASONAL ENVIRONMENT</span>
            </div>

            {activeSeason ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>🎆</span> {activeSeason.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active Rule: {activeSeason.rule}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-900 py-3 my-2">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block">Multiplier</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">{activeSeason.multiplier}x</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block">Directives</span>
                    <span className="text-[10px] font-bold text-slate-200 font-mono block truncate uppercase">{activeSeason.tone.split(",")[0]}</span>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-[9px] text-slate-400">
                  <div>
                    <span className="text-slate-600 mr-1.5">→</span>
                    <span className="font-bold text-slate-300">Directives:</span> {activeSeason.tone}
                  </div>
                  <div>
                    <span className="text-slate-600 mr-1.5">→</span>
                    <span className="font-bold text-slate-300">Target Cohorts:</span> {activeSeason.personas.join(", ")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 font-mono text-xs italic py-6">Calibrating season...</div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-900/60 pt-3">
            System calendar anchor: <span className="text-slate-300">14 June 2026</span>
          </div>
        </div>

        {/* CARD 3: Proactive Opportunity Snapshot */}
        <div className="border border-slate-900 bg-slate-950/60 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono mb-4">
              <TrendingUp size={13} className="text-purple-400" />
              <span>REVENUE OPPORTUNITIES</span>
            </div>

            {isLoadingOpps ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 font-mono text-[10px] text-slate-500">
                <RefreshCw size={14} className="animate-spin text-purple-400" />
                <span>Computing recovery pipeline...</span>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-slate-600 font-mono text-[10px] italic py-8 text-center">
                No active opportunities identified in context.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-900">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="p-2 border border-slate-900 bg-slate-950/30 rounded-lg hover:border-slate-800 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-200 font-mono">{opp.title}</div>
                        <p className="text-[8px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide truncate max-w-[130px]">{opp.action}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-emerald-400 font-mono">{formatINR(opp.revenuePotential)}</div>
                        <div className="text-[8px] text-slate-400 font-mono">Size: {opp.size}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-900/60 pt-3 flex justify-between">
            <span>Scan context: <span className="text-slate-300">{ingestBrand === "fitness-brand" ? "Fitness" : "Beauty"}</span></span>
            <span className="text-purple-400">Real-time update</span>
          </div>
        </div>

      </div>
    </section>
  );
}
