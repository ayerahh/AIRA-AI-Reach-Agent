"use client";

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Database, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Activity, 
  ShoppingBag, 
  Users, 
  ArrowRight,
  Info
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import seasonalEvents from "@/lib/seasonalEvents.json";
import { DEMO_DATASETS } from "@/lib/demoDatasets";

interface IngestResult {
  success: boolean;
  customersAdded: number;
  ordersAdded: number;
  duplicatesSkipped: number;
  totalCustomers: number;
  totalOrders: number;
  preview: any[];
}

interface Opportunity {
  id: string;
  title: string;
  size: number;
  revenuePotential: number;
  action: string;
  description: string;
}

interface BusinessOnboardingPortalProps {
  onImportSuccess?: (result: any) => void;
}

export default function BusinessOnboardingPortal({ onImportSuccess }: BusinessOnboardingPortalProps = {}) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste" | "generate">("paste");
  
  // IMPROVEMENT TWO: Lifted brand state up to sync Card 1 and Card 3
  const [selectedBrand, setSelectedBrand] = useState<"beauty-brand" | "fitness-brand">("beauty-brand");
  
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<IngestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for Upload and Paste simulation
  const [simulatedCustCount, setSimulatedCustCount] = useState<number>(60);
  const [simulatedOrdersPerCust, setSimulatedOrdersPerCust] = useState<number>(4);
  const [dragActive, setDragActive] = useState(false);
  const [mockFileName, setMockFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");

  // Card 3: Opportunities telemetry
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingOpps, setIsLoadingOpps] = useState(false);

  // Determine season from a date string dynamically
  const getSeasonFromDate = (dateStr: string | undefined) => {
    let date = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    
    const day = date.getDate();
    const month = date.getMonth(); // 0 is January, 11 is December
    
    // Check in exact order as route.ts:
    // 1. Salary Day: 30, 31, 1, 2, 3, 4, 5 of any month
    if (day >= 30 || day <= 5) {
      return { id: "salary-day", name: "Salary Day Surge", multiplier: 1.2 };
    }
    // 2. Black Friday: if day of month is 24, 25, 26, 27 (simulated)
    if (day >= 24 && day <= 27) {
      return { id: "black-friday", name: "Black Friday Sale", multiplier: 2.0 };
    }
    // 3. Diwali: if day of month is 10, 11, 12, 13, 14, 15 (simulated)
    if (day >= 10 && day <= 15) {
      return { id: "diwali", name: "Diwali Festive Season", multiplier: 1.8 };
    }
    // 4. New Year: if day of month is 28, 29 (simulated)
    if (day === 28 || day === 29) {
      return { id: "new-year", name: "New Year Resolution", multiplier: 1.3 };
    }
    // 5. IPL Season: April (3) and May (4)
    if (month === 3 || month === 4) {
      return { id: "ipl-season", name: "IPL Cricket Season", multiplier: 1.1 };
    }
    // 6. Wedding Season: June (5)
    if (month === 5) {
      return { id: "wedding-season", name: "Wedding & Festive Season", multiplier: 1.4 };
    }
    
    return { id: "regular-season", name: "Regular Trading Period", multiplier: 1.0 };
  };

  // Fetch opportunities whenever the brand changes
  const fetchOpportunities = async (brand: string) => {
    setIsLoadingOpps(true);
    try {
      const brandParam = brand === "beauty-brand" ? "beauty" : "fitness";
      const res = await fetch(`/api/opportunities?brand=${brandParam}`);
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
    fetchOpportunities(selectedBrand);
  }, [selectedBrand]);

  const handleDemoGenerate = async (type: "beauty-brand" | "fitness-brand") => {
    setSelectedBrand(type);
    setIsImporting(true);
    setErrorMessage(null);
    setImportResult(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          customerCount: 50,
          ordersPerCustomer: 5,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setImportResult(data);
        fetchOpportunities(type);
        if (onImportSuccess) {
          onImportSuccess(data);
        }
      } else {
        setErrorMessage(data.error || "Failed to generate demo business data.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during demo generation.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSimulatedIngest = async () => {
    if (activeTab === "paste" && !pastedText.trim()) {
      setErrorMessage("Please paste some customer data or business logs to parse.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setImportResult(null);

    try {
      let response;
      if (activeTab === "paste") {
        let parsed;
        try {
          parsed = JSON.parse(pastedText);
        } catch (e) {
          setErrorMessage("Invalid JSON format. Please ensure you have copied the correct dataset format.");
          setIsImporting(false);
          return;
        }

        let customerArray: any[] = [];
        if (Array.isArray(parsed)) {
          customerArray = parsed;
        } else if (parsed && Array.isArray(parsed.customers)) {
          customerArray = parsed.customers;
        } else {
          setErrorMessage("Invalid format. Expected a JSON array of customers or a dataset object containing a 'customers' array.");
          setIsImporting(false);
          return;
        }

        // Validate each customer has name, email, totalSpend, orderCount
        for (let idx = 0; idx < customerArray.length; idx++) {
          const rawCust = customerArray[idx];
          if (!rawCust.name || !rawCust.email || rawCust.totalSpend === undefined || rawCust.orderCount === undefined) {
            setErrorMessage(`Validation error at index ${idx}: Each customer must have name, email, totalSpend, and orderCount.`);
            setIsImporting(false);
            return;
          }
        }

        response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "paste",
            customers: customerArray,
          }),
        });
      } else {
        response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: selectedBrand,
            customerCount: simulatedCustCount,
            ordersPerCustomer: simulatedOrdersPerCust,
          }),
        });
      }

      const data = await response.json();
      if (response.ok && data.success) {
        setImportResult(data);
        if (activeTab !== "paste") {
          fetchOpportunities(selectedBrand);
        }
        if (onImportSuccess) {
          onImportSuccess(data);
        }
      } else {
        setErrorMessage(data.error || "Failed to complete simulated data ingestion.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during ingestion.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectDemoDataset = async (ds: any) => {
    setPastedText(JSON.stringify(ds, null, 2));
    setErrorMessage(null);
    setImportResult(null);
    setIsImporting(true);

    try {
      const customerArray = ds.customers;

      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "paste",
          customers: customerArray,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Force the imported customers array to be the parsed source array
        // so that duplicate checking on the backend doesn't result in an empty screen
        const resultData = {
          ...data,
          importedCustomers: customerArray
        };
        setImportResult(resultData);
        if (onImportSuccess) {
          onImportSuccess(resultData);
        }
      } else {
        setErrorMessage(data.error || "Failed to import demo dataset.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during demo dataset ingestion.");
    } finally {
      setIsImporting(false);
    }
  };

  // Drag and drop mock
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setMockFileName(file.name);
    }
  };

  const renderIntelligenceReport = () => {
    if (!importResult) return null;

    // Fetch importedCustomers: if in paste tab, parse the pasted text directly to display all records, otherwise use importResult preview
    let importedCustomers: any[] = [];
    if (activeTab === "paste" && pastedText) {
      try {
        const parsed = JSON.parse(pastedText);
        importedCustomers = Array.isArray(parsed) ? parsed : (parsed.customers || []);
      } catch (e) {
        importedCustomers = (importResult as any).importedCustomers || importResult.preview || [];
      }
    } else {
      importedCustomers = (importResult as any).importedCustomers || importResult.preview || [];
    }
    const customersCount = importedCustomers.length || 1;

    // Get active season dynamically from the maximum date of the dataset
    let maxDateStr = "";
    if (importedCustomers.length > 0) {
      const hasDates = importedCustomers.every((c: any) => c.lastOrderDate);
      if (hasDates) {
        maxDateStr = importedCustomers.reduce((max: string, c: any) => c.lastOrderDate > max ? c.lastOrderDate : max, "");
      }
    }
    
    // If no dates exist in the dataset, fall back to current date:
    const finalDateStr = maxDateStr || new Date().toISOString().split("T")[0];
    const datasetSeasonMeta = getSeasonFromDate(finalDateStr);
    const matched = seasonalEvents.find(s => s.id === datasetSeasonMeta.id) || {
      id: datasetSeasonMeta.id,
      name: datasetSeasonMeta.name,
      multiplier: datasetSeasonMeta.multiplier,
      tone: "standard, professional, direct",
      personas: ["Regular Customer"],
      rule: "Standard calendar days",
      recommendedAudience: "All Customers",
      expectedLift: "+10% CTR",
      recommendedChannel: "Email",
      potentialRevenue: "₹30,000"
    };
    const currentActiveSeason = {
      ...matched,
      name: datasetSeasonMeta.name,
      multiplier: datasetSeasonMeta.multiplier
    };

    // Helper to normalize persona names
    const normalizePersonaName = (p: string) => {
      const mapping: Record<string, string> = {
        "tech-enthusiast": "Tech Enthusiast",
        "luxury-buyer": "Luxury Buyer",
        "fitness-freak": "Fitness Freak",
        "discount-hunter": "Discount Hunter",
        "impulse-shopper": "Impulse Shopper",
        "loyal-customer": "Loyal Customer",
        "inactive-customer": "Inactive Customer",
        "gift-shopper": "Gift Shopper"
      };
      const cleaned = (p || "").trim().toLowerCase().replace(/_/g, "-");
      return mapping[cleaned] || p || "Regular Customer";
    };

    // 1. Business Summary Calculations
    const totalSpendSum = importedCustomers.reduce((acc, c) => acc + (c.totalSpend || 0), 0);
    const totalOrdersSum = importedCustomers.reduce((acc, c) => acc + (c.orderCount || 0), 0);
    const avgSpend = totalSpendSum / customersCount;

    // Extract dominant category/theme if present, else Mixed
    const categoriesMap: Record<string, number> = {};
    importedCustomers.forEach((c: any) => {
      const cat = c.favoriteCategory || (c.tags && c.tags[1]);
      if (cat && cat !== "beauty-lover" && cat !== "fitness-enthusiast" && cat !== "pasted-data" && cat !== "Regular Customer") {
        categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
      }
    });
    let topCategories = "Mixed";
    let maxCatCount = -1;
    Object.entries(categoriesMap).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategories = cat.charAt(0).toUpperCase() + cat.slice(1);
      }
    });

    // 2. Customer Intelligence Calculations
    const personaSpends: Record<string, number> = {};
    const personaCounts: Record<string, number> = {
      "Fitness Freak": 0,
      "Discount Hunter": 0,
      "Luxury Buyer": 0,
      "Impulse Shopper": 0,
      "Loyal Customer": 0,
      "Inactive Customer": 0,
      "Tech Enthusiast": 0,
      "Gift Shopper": 0
    };

    importedCustomers.forEach((c: any) => {
      const rawP = c.persona || (c.tags && c.tags[0]) || "Regular Customer";
      const persona = normalizePersonaName(rawP);
      personaSpends[persona] = (personaSpends[persona] || 0) + (c.totalSpend || 0);
      if (personaCounts.hasOwnProperty(persona)) {
        personaCounts[persona]++;
      }
    });

    // Determine Top Persona by spend (as per user specs: "Top Persona. Calculate based on highest totalSpend.")
    let topPersona = "Regular Customer";
    let maxSpend = -1;
    Object.entries(personaSpends).forEach(([p, spend]) => {
      if (spend > maxSpend) {
        maxSpend = spend;
        topPersona = p;
      }
    });

    // Churn Risk: count customers with lastOrderDate older than 45 days relative to dataset's own timescale
    let churnRiskCount = 0;
    const hasDates = importedCustomers.every((c: any) => c.lastOrderDate);
    if (hasDates && importedCustomers.length > 0) {
      const maxDateStr = importedCustomers.reduce((max: string, c: any) => c.lastOrderDate > max ? c.lastOrderDate : max, "2025-02-14");
      const refDate = new Date(maxDateStr);
      refDate.setDate(refDate.getDate() + 15);
      importedCustomers.forEach((c: any) => {
        const diffTime = refDate.getTime() - new Date(c.lastOrderDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 45) {
          churnRiskCount++;
        }
      });
    }

    // High Value Cohort: tier with highest totalSpend
    const tierSpends: Record<string, number> = {};
    importedCustomers.forEach((c: any) => {
      const t = c.tier || "bronze";
      tierSpends[t] = (tierSpends[t] || 0) + (c.totalSpend || 0);
    });
    let highValueCohort = "Platinum Tier";
    let maxTierSpend = -1;
    Object.entries(tierSpends).forEach(([t, spend]) => {
      if (spend > maxTierSpend) {
        maxTierSpend = spend;
        highValueCohort = t.charAt(0).toUpperCase() + t.slice(1) + " Tier";
      }
    });

    // Responsive Channel: channel with the most preferred customers in the dataset
    const channelCounts: Record<string, number> = {};
    importedCustomers.forEach((c: any) => {
      const ch = c.preferredChannel || "email";
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });
    let responsiveChannel = "WhatsApp";
    let maxChannelCount = -1;
    Object.entries(channelCounts).forEach(([ch, count]) => {
      if (count > maxChannelCount) {
        maxChannelCount = count;
        responsiveChannel = ch.charAt(0).toUpperCase() + ch.slice(1);
      }
    });

    // 3. Scale and distribute persona counts for 8 personas
    const finalPersonaDistribution = Object.keys(personaCounts).map((persona) => {
      return { persona, count: personaCounts[persona] };
    });

    // 4. Dynamic opportunities calculations
    const cartRecoverySize = Math.max(1, Math.round(customersCount * 0.22));
    const cartRecoveryRevenue = Math.round(cartRecoverySize * avgSpend * 0.7);

    const restockSize = Math.max(1, Math.round(customersCount * 0.35));
    const restockRevenue = Math.round(restockSize * avgSpend * 0.9);

    const churnSize = churnRiskCount || Math.max(1, Math.round(customersCount * 0.16));
    const churnRevenue = Math.round(churnSize * avgSpend * 1.5);

    const vipSize = Math.max(1, Math.round(customersCount * 0.08));
    const vipRevenue = Math.round(vipSize * avgSpend * 2.1);

    const allOpportunities = [
      {
        title: "Abandoned Cart Recovery",
        size: cartRecoverySize,
        revenue: cartRecoveryRevenue,
        confidence: "High" as const,
        action: "SMS cart abandonment nudge"
      },
      {
        title: "Restock Opportunity",
        size: restockSize,
        revenue: restockRevenue,
        confidence: "Medium" as const,
        action: "Category replenishment email flow"
      },
      {
        title: "Churn Risk Customers",
        size: churnSize,
        revenue: churnRevenue,
        confidence: "Medium" as const,
        action: "Win-back WhatsApp discount campaign"
      },
      {
        title: "VIP Inactive Customers",
        size: vipSize,
        revenue: vipRevenue,
        confidence: "High" as const,
        action: "Direct account manager callback + credit"
      }
    ];

    // Pick top 3 by potential revenue
    const topOpportunities = allOpportunities
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // FIX FIVE: Sum of totalSpend multiplied by 0.15 for cross sell.
    const totalPotentialRevenue = Math.round(totalSpendSum * 0.15);

    return (
      <div className="mt-8 space-y-6 animate-fade-in border-t border-slate-900 pt-8">
        
        {/* Business Summary Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 via-indigo-950/40 to-slate-950/60 border border-purple-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.1)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono text-purple-300 uppercase tracking-widest font-bold">AIRA INTELLIGENCE DISCOVERY</p>
              <h3 className="text-sm md:text-base font-bold text-white mt-1 leading-snug">
                Potential revenue opportunity of <span className="text-emerald-400 font-extrabold">{formatINR(totalPotentialRevenue)}</span> identified across 3 high-priority customer segments.
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="hidden md:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono px-3.5 py-2 rounded-lg transition-all"
          >
            <span>Sync Dashboard</span>
            <ArrowRight size={11} />
          </button>
        </div>

        {/* 2x2 Grid of Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card A: Business Summary Card */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-5 hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-900">
              <ShoppingBag size={14} className="text-purple-400" />
              <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Onboarded Business Summary</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Customers Mapped</span>
                <span className="text-xl font-bold text-white font-mono">{importedCustomers.length}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Orders Ingested</span>
                <span className="text-xl font-bold text-white font-mono">{totalOrdersSum}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Calculated Revenue</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">{formatINR(totalSpendSum)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Top Categories</span>
                <span className="text-xs font-medium text-slate-300 block truncate mt-1">{topCategories}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-[9px] text-slate-500 font-mono leading-relaxed">
              <strong>Business Insight:</strong> Generated sales records verify a customer LTV of {formatINR(Math.round(avgSpend))} per shopper. 
            </div>
          </div>

          {/* Card B: Customer Intelligence Card */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-5 hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-900">
              <Users size={14} className="text-purple-400" />
              <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Customer DNA Profiling</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Top Persona</span>
                <span className="text-xs font-bold text-white mt-1 block truncate uppercase tracking-tight">{topPersona}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">High Value Cohort</span>
                <span className="text-xs font-bold text-purple-300 mt-1 block truncate uppercase tracking-tight">{highValueCohort}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Dormant Churn Risk</span>
                <span className="text-xl font-bold text-rose-400 font-mono">{churnRiskCount} <span className="text-[10px] text-slate-500">accounts</span></span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Responsive Channel</span>
                <span className="text-xs font-bold text-emerald-400 mt-1 block truncate uppercase tracking-tight">{responsiveChannel}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900 text-[9px] text-slate-500 font-mono leading-relaxed">
              <strong>Action Strategy:</strong> Target `{topPersona}` cohorts via `{responsiveChannel}` to optimize conversion lift.
            </div>
          </div>

        </div>

        {/* 3 Columns for Persona, Seasonal, Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          
          {/* Column 1: Persona Discovery Card */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-5 flex flex-col justify-between hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-900">
                <Layers size={14} className="text-purple-400" />
                <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Persona Distribution</h4>
              </div>
              <div className="space-y-3">
                {finalPersonaDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{item.persona}</span>
                      <span className="text-slate-300">{item.count}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, (item.count / customersCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-900">
              Matches customer RFM matrix profiles.
            </div>
          </div>

          {/* Column 2: Seasonal Intelligence Card */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-5 flex flex-col justify-between hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-900">
                <Calendar size={14} className="text-purple-400" />
                <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Seasonal Context Telemetry</h4>
              </div>

              {currentActiveSeason ? (
                <div className="space-y-4">
                  <div className="bg-purple-950/20 border border-purple-500/10 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block">Active Season</span>
                      <span className="text-xs font-bold text-white font-mono mt-0.5 block">🎆 {currentActiveSeason.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block">Multiplier</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">{currentActiveSeason.multiplier}x</span>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-[10px]">
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-500 uppercase text-[9px]">Target Cohort:</span>
                      <span className="text-slate-200 font-bold text-right truncate max-w-[140px]">{currentActiveSeason.recommendedAudience}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-500 uppercase text-[9px]">Expected Lift:</span>
                      <span className="text-emerald-400 font-bold">{currentActiveSeason.expectedLift}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-500 uppercase text-[9px]">Best Channel:</span>
                      <span className="text-purple-300 font-bold">{currentActiveSeason.recommendedChannel}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-500 uppercase text-[9px]">Event Potential:</span>
                      <span className="text-emerald-400 font-bold">{currentActiveSeason.potentialRevenue}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 font-mono text-xs italic py-6">Calibrating season...</div>
              )}
            </div>

            <div className="text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-900 flex justify-between">
              <span>Anchor Date: <span className="text-slate-300">{finalDateStr}</span></span>
              <span className="text-purple-500 font-bold">Multiplier Active</span>
            </div>
          </div>

          {/* Column 3: Opportunity Discovery Card */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-5 flex flex-col justify-between hover:border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.05)] transition-all">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-900">
                <Activity size={14} className="text-purple-400" />
                <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Opportunities Discovered</h4>
              </div>

              <div className="space-y-3">
                {isLoadingOpps ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 font-mono text-[10px] text-slate-500">
                    <RefreshCw size={14} className="animate-spin text-purple-400" />
                    <span>Computing opportunities...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-900">
                    {topOpportunities.map((opp, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/60 hover:border-purple-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[10px] font-bold text-white font-mono">{opp.title}</div>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wide font-bold ${
                            opp.confidence === "High" 
                              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" 
                              : "bg-amber-950/30 border-amber-500/30 text-amber-400"
                          }`}>
                            {opp.confidence}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline font-mono text-[9px] text-slate-400">
                          <span>Potential: <span className="text-emerald-400 font-bold">{formatINR(opp.revenue)}</span></span>
                          <span>Audience: {opp.size}</span>
                        </div>
                        <div className="text-[8.5px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                          <strong>Action:</strong> {opp.action}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-900 flex justify-between">
              <span>Proactive Recovery List</span>
              <span className="text-purple-400">Top 3 Sorted</span>
            </div>
          </div>

        </div>

      </div>
    );
  };

  return (
    <section className="mb-12 border border-slate-800/80 rounded-2xl bg-slate-950/40 backdrop-blur-md p-6 select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)] animate-slide-up">
      
      {/* Title block */}
      <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-900">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Upload size={15} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">AI Business Onboarding Portal</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">// STATISTIC INGESTION TUNNEL AND CAMPAIGN OPPORTUNITY DECK</p>
        </div>
      </div>


      {/* Tabs list */}
      <div className="flex border-b border-slate-900 mb-6 bg-slate-950/30 p-1 rounded-xl border border-slate-900">
        <button
          onClick={() => {
            setActiveTab("upload");
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === "upload" 
              ? "bg-purple-600/15 border border-purple-500/30 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Upload size={13} />
          Upload File
        </button>
        <button
          onClick={() => {
            setActiveTab("paste");
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === "paste" 
              ? "bg-purple-600/15 border border-purple-500/30 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <FileText size={13} />
          Paste Data
        </button>
        <button
          disabled={true}
          className="flex-1 py-2.5 text-xs font-mono font-semibold rounded-lg flex items-center justify-center gap-2 text-slate-600 cursor-not-allowed opacity-45 select-none font-sans"
        >
          <Sparkles size={13} />
          Generate Demo (Locked)
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-4">
        
        {/* Tab 1: Upload File */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center border-slate-900 bg-slate-950/10 opacity-50 cursor-not-allowed select-none"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-sans font-medium">
                    Drag and drop your file here, or <span className="text-slate-500 cursor-not-allowed">browse files</span>
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono mt-1">
                    (Upload disabled. We apologize, file upload is coming soon!)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-950/40 rounded-xl w-full">
              <div className="p-3.5 bg-purple-950/20 border border-purple-500/20 rounded-xl flex items-start gap-2.5">
                <Info size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs font-mono text-slate-300">
                  <span className="font-bold text-white block mb-1">Convert CSV/Excel to JSON:</span> We recommend using <a href="https://csvtojson.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-bold">csvtojson.com</a>. Since our high-intelligence onboarding tunnel expects structured JSON profiles, you can use this free online tool to convert your existing spreadsheets instantly before pasting or uploading.
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-900">
                <div className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1.5">
                  <AlertCircle size={11} className="text-amber-500" />
                  <span>Screenshot OCR not yet implemented. Coming soon.</span>
                </div>

                <div className="flex gap-3">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 font-sans"
                  >
                    <option value="beauty-brand">Beauty Mapped</option>
                    <option value="fitness-brand">Fitness Mapped</option>
                  </select>
                  <button
                    disabled={true}
                    className="bg-slate-800 text-slate-500 border border-slate-800/80 font-semibold text-xs px-5 py-2.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5 font-sans"
                  >
                    <span>🔒 Upload Locked</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Data */}
        {activeTab === "paste" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Column: Demo datasets */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 font-sans leading-relaxed">
                Wanna test the tool but lazy to find/obtain data? No worries. Use any of these 3:
              </p>
              <div className="space-y-2.5">
                {DEMO_DATASETS.map((ds, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectDemoDataset(ds)}
                    className="w-full text-left p-3.5 bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/40 rounded-xl transition-all group flex flex-col gap-1 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-white font-mono group-hover:text-purple-400 transition-colors">
                        {ds.dataset}
                      </span>
                      <span className="text-[8px] font-mono bg-purple-950/40 text-purple-400 border border-purple-900/30 px-1.5 py-0.5 rounded uppercase tracking-wide font-bold">
                        {ds.dataset.includes("CHAI") ? "☕ Coffee" : ds.dataset.includes("PET") ? "🐾 Pets" : "💪 Gym"}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-sans font-medium">
                      {ds.theme}
                    </span>
                    <span className="text-[8.5px] text-slate-500 font-mono mt-0.5 leading-normal block group-hover:text-slate-400 transition-colors">
                      {ds.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Textarea & Ingest Action */}
            <div className="lg:col-span-2 space-y-4">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste customer JSON array, CRM export, or business summary here."
                className="w-full min-h-[180px] bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/10 resize-none transition-all"
              />
              
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-lg font-mono text-[9px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px]">Example input format:</div>
                <pre className="overflow-x-auto select-text">
                  {`[
  { "name": "Priya", "email": "priya102@example.com", "totalSpend": 24500, "orderCount": 8 },
  { "name": "Amit", "email": "amit940@example.com", "totalSpend": 8500, "orderCount": 2 }
]`}
                </pre>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-slate-500 font-mono">Input parser maps name, email, RFM fields.</span>
                <div className="flex gap-3">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/50 font-sans"
                  >
                    <option value="beauty-brand">Beauty Mapped</option>
                    <option value="fitness-brand">Fitness Mapped</option>
                  </select>
                  <button
                    onClick={handleSimulatedIngest}
                    disabled={isImporting || !pastedText.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all flex items-center justify-center font-sans"
                  >
                    {isImporting && <RefreshCw className="animate-spin w-4 h-4 mr-2" />}
                    <span>Ingest Mapped CRM Data</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Generate Demo Business */}
        {activeTab === "generate" && (
          <div className="p-8 border border-slate-900 bg-slate-950/20 rounded-xl text-center space-y-5">
            <div>
              <p className="text-xs text-slate-300 font-sans font-medium">
                Simulate bulk business onboarding with standard datasets
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-1 leading-relaxed max-w-sm mx-auto">
                Generates 50 customer profiles with up to 5 orders per shopper, running deduplication and active season mapping.
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleDemoGenerate("beauty-brand")}
                disabled={isImporting}
                className="px-6 py-3 border border-purple-500/30 hover:border-purple-500/50 bg-slate-950/40 hover:bg-slate-900 rounded-xl text-xs font-semibold font-mono text-slate-200 tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isImporting && selectedBrand === "beauty-brand" && <RefreshCw className="animate-spin w-4 h-4 mr-1" />}
                💄 Velour (Fashion)
              </button>
              <button
                onClick={() => handleDemoGenerate("fitness-brand")}
                disabled={isImporting}
                className="px-6 py-3 border border-purple-500/30 hover:border-purple-500/50 bg-slate-950/40 hover:bg-slate-900 rounded-xl text-xs font-semibold font-mono text-slate-200 tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isImporting && selectedBrand === "fitness-brand" && <RefreshCw className="animate-spin w-4 h-4 mr-1" />}
                💪 FitFuel (Fitness)
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg border border-rose-500/20 bg-rose-950/20 text-rose-300 font-mono text-[10px] flex items-start gap-1.5">
          <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* POST INGESTION EXPERIENCE: AI Intelligence Report */}
      {renderIntelligenceReport()}

    </section>
  );
}
