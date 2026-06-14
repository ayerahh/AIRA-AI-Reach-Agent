"use client";

import React, { useState, useEffect } from "react";
import { 
  RefreshCw, 
  Crown, 
  Dumbbell, 
  Laptop, 
  Tag, 
  Heart, 
  Zap, 
  Gift, 
  Clock, 
  User, 
  ShoppingBag, 
  Calendar,
  MessageSquare,
  Mail,
  AlertTriangle,
  Award,
  Phone,
  TrendingUp
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface TopCustomerSpotlightProps {
  importResult: any;
  onCustomerChange?: (customer: any) => void;
}

export default function TopCustomerSpotlight({ importResult, onCustomerChange }: TopCustomerSpotlightProps) {
  const [mvpList, setMvpList] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Get Lucide Icon for a Persona
  const getPersonaIcon = (persona: string) => {
    const p = persona.toLowerCase();
    if (p.includes("tech")) return <Laptop size={14} className="text-blue-400" />;
    if (p.includes("luxury")) return <Crown size={14} className="text-amber-400" />;
    if (p.includes("fitness") || p.includes("freak")) return <Dumbbell size={14} className="text-emerald-400" />;
    if (p.includes("discount")) return <Tag size={14} className="text-purple-400" />;
    if (p.includes("loyal")) return <Heart size={14} className="text-rose-400" />;
    if (p.includes("impulse")) return <Zap size={14} className="text-yellow-400" />;
    if (p.includes("gift")) return <Gift size={14} className="text-pink-400" />;
    if (p.includes("inactive")) return <Clock size={14} className="text-slate-500" />;
    return <User size={14} className="text-indigo-400" />;
  };

  // Weighted score calculation
  // 40% totalSpend, 30% orderCount, 20% recency, 10% engagementScore
  useEffect(() => {
    if (!importResult) {
      setMvpList([]);
      setCurrentIndex(0);
      return;
    }

    const customers: any[] = importResult.importedCustomers || importResult.preview || [];
    if (customers.length === 0) {
      setMvpList([]);
      setCurrentIndex(0);
      return;
    }

    const maxSpend = Math.max(...customers.map(c => Number(c.totalSpend || 0))) || 1;
    const maxOrders = Math.max(...customers.map(c => Number(c.orderCount || 0))) || 1;

    // Recency reference: latest lastOrderDate in dataset
    const maxDateStr = customers.reduce((max: string, c: any) => c.lastOrderDate > max ? c.lastOrderDate : max, "2025-02-14");
    const maxDateTime = new Date(maxDateStr).getTime();

    const scored = customers.map((c: any) => {
      const spendScore = ((c.totalSpend || 0) / maxSpend) * 100;
      const orderScore = ((c.orderCount || 0) / maxOrders) * 100;

      let recencyScore = 0;
      if (c.lastOrderDate) {
        const diffTime = maxDateTime - new Date(c.lastOrderDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
        if (diffDays <= 30) {
          recencyScore = 100;
        }
      }

      // Updated weighted score: 50% totalSpend, 30% orderCount, 20% recency
      const totalScore = (spendScore * 0.5) + (orderScore * 0.3) + (recencyScore * 0.2);

      return {
        ...c,
        mvpScore: totalScore,
        diffDays: c.lastOrderDate ? Math.ceil((maxDateTime - new Date(c.lastOrderDate).getTime()) / (1000 * 3600 * 24)) : 999
      };
    });

    // Sort descending by score
    const sorted = scored.sort((a, b) => b.mvpScore - a.mvpScore);
    setMvpList(sorted);
    setCurrentIndex(0);
  }, [importResult]);

  const currentCustomer = mvpList[currentIndex] ?? null;

  useEffect(() => {
    if (onCustomerChange) {
      onCustomerChange(currentCustomer);
    }
  }, [currentCustomer, onCustomerChange]);

  if (mvpList.length === 0) return null;

  const handleCycleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mvpList.length);
  };

  // Get Churn Risk Rating label and styles
  const getChurnRisk = (days: number) => {
    if (days <= 30) return { label: "Low", style: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" };
    if (days <= 45) return { label: "Medium", style: "border-amber-500/30 bg-amber-950/20 text-amber-400" };
    return { label: "High", style: "border-rose-500/30 bg-rose-950/20 text-rose-400" };
  };

  const churnRisk = getChurnRisk(currentCustomer.diffDays);

  // Witty observations selector
  const getWittyObservation = (c: any) => {
    if (c.wittyObservation) {
      return c.wittyObservation;
    }
    const name = c.name || "This customer";
    const rawP = c.persona || (c.tags && c.tags[0]) || "Regular Customer";
    const persona = rawP.toLowerCase().replace(/_/g, "-");

    if (persona.includes("fitness-freak") || persona.includes("fitness")) {
      return `${name}'s commitment to fitness is high. The cart remains suspiciously full.`;
    }
    if (persona.includes("luxury-buyer") || persona.includes("luxury")) {
      return `${name}'s quality standards appear refreshingly high. The wallet agrees.`;
    }
    if (persona.includes("discount-hunter") || persona.includes("discount")) {
      return `${name} opens promotional emails before the team finishes writing them.`;
    }
    if (persona.includes("loyal-customer") || persona.includes("loyal")) {
      return `${name} has been with us longer than some team members.`;
    }
    if (persona.includes("impulse-shopper") || persona.includes("impulse")) {
      return `${name}'s 'buy now' button does not stand a chance.`;
    }
    if (persona.includes("tech-enthusiast") || persona.includes("tech")) {
      return `${name} probably wrote a script to automate checkout.`;
    }
    if (persona.includes("gift-shopper") || persona.includes("gift")) {
      return `${name} buys for others. Occasionally keeps one for self.`;
    }
    if (persona.includes("inactive-customer") || persona.includes("inactive")) {
      return `${name} is still thinking about that last purchase.`;
    }
    return `${name} has been actively scanning catalog matches this quarter.`;
  };

  const getChannelIcon = (ch: string) => {
    const channel = (ch || "").toLowerCase();
    if (channel.includes("whatsapp")) return <MessageSquare size={13} className="text-emerald-400" />;
    if (channel.includes("email")) return <Mail size={13} className="text-purple-400" />;
    return <Phone size={13} className="text-indigo-400" />;
  };

  const rawPersona = currentCustomer.persona || (currentCustomer.tags && currentCustomer.tags[0]) || "Regular Customer";
  const normalizedPersona = normalizePersonaName(rawPersona);

  return (
    <section data-tour="customer-spotlight" className="mb-12 rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/80 backdrop-blur-md select-none shadow-[0_4px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all duration-300 animate-slide-up overflow-hidden border border-slate-800/60 hover:border-purple-500/20">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      <div className="p-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Award size={15} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Top Customer Spotlight</h3>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Your highest-value customers, ranked by recency, purchase frequency, and total spend (RFM)</p>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-purple-950/30 text-purple-400 border border-purple-900/30 px-2 py-0.5 rounded-md">
          Rank #{currentIndex + 1} of {mvpList.length}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch gap-6">
        
        {/* Left Column: VIP Card & Observation */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Futuristic VIP Card Visual */}
          <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/60 border border-purple-500/20 p-5 flex flex-col justify-between overflow-hidden shadow-2xl group hover:border-purple-400/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all duration-300 select-none">
            {/* Ambient sliding light streak */}
            <div className="absolute -inset-y-12 -left-12 w-12 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[400%] transition-transform duration-1000 ease-out" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-0.5 text-left">
                <span className="text-[8px] font-mono text-purple-400 tracking-[0.25em] uppercase font-bold">AIRA VIP DOSSIER</span>
                <h4 className="text-lg font-black text-white tracking-wide font-sans truncate max-w-[200px]">{currentCustomer.name}</h4>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[220px] block">{currentCustomer.email}</span>
              </div>
              
              {/* Gold Chip Visual */}
              <svg className="w-9 h-7 text-amber-500/80 opacity-80" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="16" rx="3" fill="url(#chip-grad)" stroke="currentColor" />
                <path d="M6 2v4M12 2v4M18 2v4M6 14v4M12 14v4M18 14v4M2 6h4M2 10h4M2 14h4M18 6h4M18 10h4M18 14h4" />
                <defs>
                  <linearGradient id="chip-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex justify-between items-end relative z-10 border-t border-slate-900/40 pt-3 text-left">
              <div className="space-y-0.5">
                <span className="text-[7px] font-mono text-slate-500 uppercase tracking-wider block">Customer Segment</span>
                <div className="flex items-center gap-1.5">
                  {getPersonaIcon(rawPersona)}
                  <span className="text-[9.5px] font-bold text-slate-200 font-mono uppercase tracking-wider">
                    {normalizedPersona}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-mono text-slate-500 uppercase tracking-wider block">RFM Rating</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono tracking-tight">
                  {currentCustomer.mvpScore.toFixed(1)}<span className="text-[9px] text-slate-500">/100</span>
                </span>
              </div>
            </div>
          </div>

          {/* Observation Block & Cycle Trigger */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-800 transition-colors">
            <div className="flex-1 space-y-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${churnRisk.label === "Low" ? "bg-emerald-500" : churnRisk.label === "Medium" ? "bg-amber-500" : "bg-rose-500"}`} />
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">{churnRisk.label} Churn Risk Profile</span>
              </div>
              <p className="text-xs text-purple-200/90 font-sans italic pl-1 leading-relaxed">
                "{getWittyObservation(currentCustomer)}"
              </p>
            </div>
            
            {/* Cycle next top customer button */}
            <button
              onClick={handleCycleNext}
              title="Cycle to next top customer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 transition-all cursor-pointer flex-shrink-0"
            >
              <RefreshCw size={11} className="hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Next Customer</span>
            </button>
          </div>

        </div>

        {/* Right Details Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          
          {/* Attribute 1: LTV */}
          <div className="border border-slate-900/60 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-800/80 hover:bg-slate-950/45 transition-all group text-left">
            <div className="flex justify-between items-start">
              <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500">Lifetime Value</span>
              <TrendingUp size={12} className="text-emerald-500/60" />
            </div>
            <div className="mt-4">
              <span className="text-lg font-bold text-emerald-400 font-mono tracking-tight">{formatINR(currentCustomer.totalSpend)}</span>
              <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentCustomer.totalSpend / 200000) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Attribute 2: Orders count */}
          <div className="border border-slate-900/60 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-800/80 hover:bg-slate-950/45 transition-all group text-left">
            <div className="flex justify-between items-start">
              <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500">Order Frequency</span>
              <ShoppingBag size={12} className="text-indigo-400/60" />
            </div>
            <div className="mt-4">
              <span className="text-lg font-bold text-slate-100 font-mono tracking-tight">{currentCustomer.orderCount} <span className="text-[10px] text-slate-500">purchased</span></span>
              <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${Math.min(100, (currentCustomer.orderCount / 25) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Attribute 3: Favorite Category */}
          <div className="border border-slate-900/60 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-800/80 hover:bg-slate-950/45 transition-all group text-left">
            <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block mb-3">Favorite Category</span>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-200 font-mono uppercase tracking-wide bg-purple-950/40 border border-purple-900/30 px-2.5 py-1 rounded-md inline-block">
                {currentCustomer.favoriteCategory || (currentCustomer.tags && currentCustomer.tags[1]) || "General"}
              </span>
              <span className="text-[8px] text-slate-500 font-mono block mt-1">Main transaction anchor</span>
            </div>
          </div>

          {/* Attribute 4: Preferred Channel */}
          <div className="border border-slate-900/60 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-800/80 hover:bg-slate-950/45 transition-all group text-left">
            <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 block mb-3">Preferred Channel</span>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                {getChannelIcon(currentCustomer.preferredChannel)}
              </div>
              <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                {currentCustomer.preferredChannel || "Email"}
              </span>
            </div>
          </div>

        </div>

      </div>
      </div>
    </section>
  );
}
