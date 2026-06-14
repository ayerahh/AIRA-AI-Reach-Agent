import { NextRequest, NextResponse } from "next/server";
import { getCustomers } from "@/lib/store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand") || "beauty-brand";

    const allCustomers = getCustomers();
    
    // Filter customers based on brand affinity (supports both short and full brand parameters)
    let targetCustomers = allCustomers;
    if (brand === "fitness-brand" || brand === "fitness") {
      const filtered = allCustomers.filter(c => c.tags.includes("fitness-enthusiast"));
      if (filtered.length > 0) {
        targetCustomers = filtered;
      }
    } else {
      const filtered = allCustomers.filter(c => c.tags.includes("beauty-lover"));
      if (filtered.length > 0) {
        targetCustomers = filtered;
      }
    }

    const now = new Date("2026-06-14"); // Fixed current system date context (June 2026)

    // Helper to calculate days between dates
    const getDaysDifference = (dateStr: string) => {
      const date = new Date(dateStr);
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // 1. High Churn-Risk Opportunities
    const churnRiskCustomers = targetCustomers.filter(c => {
      const days = getDaysDifference(c.lastOrderDate);
      return c.tags.includes("Inactive Customer") || c.status === "lapsed" || c.status === "at_risk" || days > 45;
    });
    const churnRiskSize = churnRiskCustomers.length;
    const churnRiskRevenue = churnRiskCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) * 1.5;

    // 2. Restock Opportunities
    const restockCustomers = targetCustomers.filter(c => {
      const days = getDaysDifference(c.lastOrderDate);
      return c.orderCount >= 3 && days >= 30 && days <= 60;
    });
    const restockSize = restockCustomers.length || Math.max(1, Math.floor(targetCustomers.length * 0.15));
    const restockRevenue = restockCustomers.length > 0
      ? restockCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) * 0.8
      : (targetCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) / targetCustomers.length) * restockSize * 0.8;

    // 3. VIP Inactive Opportunities
    const vipInactiveCustomers = targetCustomers.filter(c => {
      const days = getDaysDifference(c.lastOrderDate);
      return (c.tier === "platinum" || c.tier === "gold") && days > 30;
    });
    const vipSize = vipInactiveCustomers.length;
    const vipRevenue = vipInactiveCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) * 2.2;

    // 4. Abandoned Cart Recovery
    const cartRecoveryCustomers = targetCustomers.filter(c => {
      const days = getDaysDifference(c.lastOrderDate);
      return c.status === "active" && c.engagementScore < 70 && days <= 30;
    });
    const cartSize = cartRecoveryCustomers.length || Math.max(2, Math.floor(targetCustomers.length * 0.1));
    const cartRevenue = cartRecoveryCustomers.length > 0
      ? cartRecoveryCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) * 0.9
      : (targetCustomers.reduce((acc, c) => acc + c.avgOrderValue, 0) / targetCustomers.length) * cartSize * 0.9;

    const opportunities = [
      {
        id: "churn-risk",
        title: "High Churn-Risk",
        size: churnRiskSize,
        revenuePotential: Math.round(churnRiskRevenue),
        action: "Winback Discount Campaign",
        description: "Re-engage customers showing high risk of drop-off."
      },
      {
        id: "restock-opp",
        title: "Restock Opportunities",
        size: restockSize,
        revenuePotential: Math.round(restockRevenue),
        action: "Personalized Restock Reminder",
        description: "Remind repeat purchasers to stock up on their favorites."
      },
      {
        id: "vip-inactive",
        title: "VIP Inactive Customers",
        size: vipSize,
        revenuePotential: Math.round(vipRevenue),
        action: "Exclusive Early Access Drop",
        description: "Invite lapsed high-value VIP tiers back with an exclusive catalog."
      },
      {
        id: "cart-recovery",
        title: "Abandoned Cart Recovery",
        size: cartSize,
        revenuePotential: Math.round(cartRevenue),
        action: "SMS Cart Abandonment Nudge",
        description: "Recover active baskets with automated personalized SMS links."
      }
    ];

    // Sort opportunities by revenue potential descending
    opportunities.sort((a, b) => b.revenuePotential - a.revenuePotential);

    return NextResponse.json({
      success: true,
      opportunities
    });
  } catch (error: unknown) {
    console.error("Opportunities API error:", error);
    const message = error instanceof Error ? error.message : "Failed to load opportunities";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
