import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/store";
import type { CampaignSuggestion } from "@/lib/campaign-suggestions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * GET /api/campaigns/suggestions
 *
 * Analyses the live customer base and returns 8–10 campaign ideas that are
 * specific to the actual segment sizes, tiers, and behaviours observed.
 * Falls back to deterministic data-driven suggestions if Groq is unavailable.
 */
export async function GET() {
  const customers = getCustomers();

  if (customers.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // ── Compute real segment stats ────────────────────────────────────────────
  const now = Date.now();
  const dayMs = 86_400_000;

  const lapsed90 = customers.filter(c => (now - new Date(c.lastOrderDate).getTime()) / dayMs >= 90);
  const atRisk = customers.filter(c => c.status === "at_risk");
  const vip = customers.filter(c => c.tier === "platinum" || c.tier === "gold");
  const vipInactive = vip.filter(c => (now - new Date(c.lastOrderDate).getTime()) / dayMs > 30);
  const firstTimers = customers.filter(c => c.orderCount === 1);
  const highEngagement = customers.filter(c => c.engagementScore >= 80 && c.status === "active");
  const discountHunters = customers.filter(c => c.tags?.includes("Discount Hunter"));
  const loyalCustomers = customers.filter(c => c.tags?.includes("Loyal Customer") || (c.orderCount >= 6 && c.status === "active"));

  const avgSpend = Math.round(customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length);
  const topCity = (() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => { counts[c.city] = (counts[c.city] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Bangalore";
  })();
  const dominantChannel = (() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => { counts[c.preferredChannel] = (counts[c.preferredChannel] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "email";
  })();

  const segmentSnapshot = `
Customer base: ${customers.length} total
- Lapsed 90d+: ${lapsed90.length}
- At-risk (30–60d inactive): ${atRisk.length}
- VIP (gold/platinum): ${vip.length} (${vipInactive.length} currently inactive)
- First-time buyers: ${firstTimers.length}
- Highly engaged (score ≥ 80, active): ${highEngagement.length}
- Discount hunters: ${discountHunters.length}
- Loyal repeat buyers: ${loyalCustomers.length}
- Avg lifetime spend: ₹${avgSpend.toLocaleString("en-IN")}
- Top city: ${topCity}
- Dominant channel: ${dominantChannel}
`.trim();

  // ── Try Groq ──────────────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an expert CRM strategist. Based on the customer data snapshot below, generate exactly 8 campaign suggestions tailored to the specific numbers and segments you see.

${segmentSnapshot}

Rules:
- Reference actual numbers (e.g. "Re-engage the ${lapsed90.length} customers...")
- Each suggestion = a concise action sentence (under 25 words) a marketer would type as a campaign goal
- Cover different intents: win-back, VIP reward, upsell, cross-sell, reactivation, churn prevention
- Do NOT use generic phrases that could apply to any brand
- Use ₹ for currency

Return ONLY valid JSON:
{
  "suggestions": [
    { "label": "Short label (4-7 words)", "text": "The full campaign goal sentence the marketer would type." },
    ...
  ]
}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(GROQ_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as { suggestions: CampaignSuggestion[] };
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            return NextResponse.json({
              suggestions: parsed.suggestions.map(s => ({ ...s, dynamic: true })),
              meta: { source: "groq", segments: segmentSnapshot },
            });
          }
        }
      }
    } catch (err) {
      console.warn("[suggestions] Groq unavailable, using deterministic fallback:", (err as Error).message);
    }
  }

  // ── Deterministic fallback — still data-driven ────────────────────────────
  const fallback: CampaignSuggestion[] = [];

  if (lapsed90.length > 0) {
    fallback.push({
      label: `Win back ${lapsed90.length} lapsed customers`,
      text: `Re-engage the ${lapsed90.length} customers who haven't purchased in 90+ days with a personalised comeback offer and a time-limited discount.`,
      dynamic: true,
    });
  }
  if (vipInactive.length > 0) {
    fallback.push({
      label: `Reactivate ${vipInactive.length} inactive VIPs`,
      text: `Give the ${vipInactive.length} gold and platinum customers who've been quiet for 30+ days an exclusive early-access drop to bring them back.`,
      dynamic: true,
    });
  }
  if (atRisk.length > 0) {
    fallback.push({
      label: `Save ${atRisk.length} at-risk customers`,
      text: `Prevent churn for the ${atRisk.length} at-risk customers by sending a personalised save offer before they lapse.`,
      dynamic: true,
    });
  }
  if (firstTimers.length > 0) {
    fallback.push({
      label: `Convert ${firstTimers.length} first-time buyers`,
      text: `Nudge the ${firstTimers.length} customers who placed exactly one order toward a second purchase with a loyalty welcome incentive.`,
      dynamic: true,
    });
  }
  if (highEngagement.length > 0) {
    fallback.push({
      label: `Upsell ${highEngagement.length} highly engaged customers`,
      text: `Target the ${highEngagement.length} highly engaged active customers with a premium bundle offer to grow their average order value.`,
      dynamic: true,
    });
  }
  if (discountHunters.length > 0) {
    fallback.push({
      label: `Upsell ${discountHunters.length} discount hunters`,
      text: `Move ${discountHunters.length} discount-motivated buyers toward higher-margin bundles with tiered spend incentives instead of flat discounts.`,
      dynamic: true,
    });
  }
  if (loyalCustomers.length > 0) {
    fallback.push({
      label: `Reward ${loyalCustomers.length} loyal repeat buyers`,
      text: `Celebrate the ${loyalCustomers.length} loyal customers with an exclusive members-only flash sale and double loyalty points for 48 hours.`,
      dynamic: true,
    });
  }
  fallback.push({
    label: `${topCity} geo-targeted campaign`,
    text: `Run a localised campaign for customers in ${topCity} — our largest city segment — with city-specific messaging and free same-day delivery.`,
    dynamic: true,
  });
  fallback.push({
    label: `${dominantChannel} channel reactivation`,
    text: `Re-engage inactive customers via ${dominantChannel}, their dominant channel, with a personalised message and a limited-time incentive.`,
    dynamic: true,
  });

  return NextResponse.json({
    suggestions: fallback,
    meta: { source: "deterministic", segments: segmentSnapshot },
  });
}
