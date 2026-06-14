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
  Phone
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface TopCustomerSpotlightProps {
  importResult: any;
}

export default function TopCustomerSpotlight({ importResult }: TopCustomerSpotlightProps) {
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

  if (mvpList.length === 0) return null;

  const currentCustomer = mvpList[currentIndex];

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
    <section className="mb-12 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl bg-slate-950/40 backdrop-blur-md p-6 select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.05)] transition-all duration-300 animate-slide-up">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Award size={15} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Top Customer Spotlight</h3>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">// REAL-TIME RFM HIGHEST WEIGHTED VALUE SHOOTER</p>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-purple-950/30 text-purple-400 border border-purple-900/30 px-2 py-0.5 rounded-md">
          Rank #{currentIndex + 1} of {mvpList.length}
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-6">
        
        {/* Left Card: Customer Identity details */}
        <div className="flex-1 bg-slate-950/35 border border-slate-900 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            
            {/* Customer name and cycle button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-white font-sans">{currentCustomer.name}</span>
                <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${churnRisk.style}`}>
                  {churnRisk.label} Churn Risk
                </span>
              </div>
              
              {/* Refresh / cycle button */}
              <button
                onClick={handleCycleNext}
                title="Cycle to next top customer"
                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <RefreshCw size={12} className="hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>

            {/* Persona label */}
            <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-850 px-2.5 py-1 rounded-lg">
              {getPersonaIcon(rawPersona)}
              <span className="text-[10px] font-bold text-slate-300 font-mono uppercase tracking-wider">
                {normalizedPersona}
              </span>
            </div>

            {/* Witty observation block */}
            <p className="text-xs text-purple-200/90 font-sans italic border-l-2 border-purple-500/40 pl-3.5 py-1 leading-relaxed bg-purple-950/5 rounded-r-md">
              "{getWittyObservation(currentCustomer)}"
            </p>

          </div>

          <div className="text-[8.5px] text-slate-500 font-mono border-t border-slate-900/60 pt-2.5">
            Weighted Score: <span className="text-purple-400 font-bold">{currentCustomer.mvpScore.toFixed(1)}/100</span> (LTV, Orders, Recency, Engagement)
          </div>
        </div>

        {/* Right Details Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          
          {/* Attribute 1: LTV */}
          <div className="border border-slate-905 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-850 transition-colors">
            <span className="text-[8.5px] uppercase tracking-wider font-mono text-slate-500 block">Lifetime Value (LTV)</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatINR(currentCustomer.totalSpend)}</span>
          </div>

          {/* Attribute 2: Orders count */}
          <div className="border border-slate-905 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-850 transition-colors">
            <span className="text-[8.5px] uppercase tracking-wider font-mono text-slate-500 block">Total Orders</span>
            <span className="text-lg font-bold text-white font-mono mt-1">{currentCustomer.orderCount} <span className="text-[10px] text-slate-500">purchased</span></span>
          </div>

          {/* Attribute 3: Favorite Category */}
          <div className="border border-slate-905 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-850 transition-colors">
            <span className="text-[8.5px] uppercase tracking-wider font-mono text-slate-500 block">Favorite Category</span>
            <span className="text-xs font-bold text-slate-200 font-mono uppercase mt-1 truncate">
              {currentCustomer.favoriteCategory || (currentCustomer.tags && currentCustomer.tags[1]) || "Mixed"}
            </span>
          </div>

          {/* Attribute 4: Preferred Channel */}
          <div className="border border-slate-905 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between hover:border-slate-850 transition-colors">
            <span className="text-[8.5px] uppercase tracking-wider font-mono text-slate-500 block">Preferred Channel</span>
            <div className="flex items-center gap-1.5 mt-2">
              {getChannelIcon(currentCustomer.preferredChannel)}
              <span className="text-xs font-bold text-slate-300 font-mono uppercase">
                {currentCustomer.preferredChannel || "Email"}
              </span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}
