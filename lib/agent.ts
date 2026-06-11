/**
 * AIRA Agent Service — lib/agent.ts
 *
 * This module contains the deterministic "fake AI" reasoning engine.
 * It produces realistic-looking campaign plans from natural language goals
 * by pattern-matching intent and running real data queries against the store.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  LLM SWAP POINT                                         │
 * │  To plug in a real LLM, replace `buildFakeReasoning()`  │
 * │  with a call to callLLM(). The function signature and   │
 * │  return type are identical — nothing else changes.      │
 * └─────────────────────────────────────────────────────────┘
 */

import type {
  Customer,
  Order,
  Campaign,
  AudienceSegment,
  AudienceFilter,
  MessageVariant,
  AgentReasoning,
  AgentStep,
  CampaignChannel,
} from "./types";
import { makeId } from "./utils";

// ─── Intent Detection ────────────────────────────────────────────────────────

type CampaignIntent =
  | "win_back_lapsed"       // re-engage customers gone quiet
  | "vip_exclusive"         // reward top-tier customers
  | "new_customer_convert"  // nudge first-timers toward repeat
  | "at_risk_save"          // prevent churn before it happens
  | "general_promo";        // catch-all broadcast

interface ParsedGoal {
  intent: CampaignIntent;
  hasDaysInactive?: number;   // e.g. "90 days"
  hasTier?: string[];         // e.g. ["gold", "platinum"]
  hasDiscount?: boolean;
  hasLoyalty?: boolean;
  rawKeywords: string[];
}

/**
 * Extracts structured intent from a free-text campaign goal.
 * Uses keyword matching — replace with an LLM call for production.
 */
function parseGoal(goalText: string): ParsedGoal {
  const lower = goalText.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);

  // Detect days-inactive signal
  const daysMatch = lower.match(/(\d+)\s*(?:days?|d)\b/);
  const hasDaysInactive = daysMatch ? parseInt(daysMatch[1], 10) : undefined;

  // Detect tier references
  const tierKeywords = ["gold", "silver", "platinum", "bronze", "vip", "premium", "top"];
  const hasTier = tierKeywords.filter((t) => lower.includes(t));

  // Detect discount / loyalty signals
  const hasDiscount = /discount|offer|deal|promo|sale|coupon|off|saving/.test(lower);
  const hasLoyalty = /loyal|loyalty|reward|programme|member|exclusive|early access/.test(lower);

  // Classify intent
  let intent: CampaignIntent = "general_promo";

  if (/re.?engage|lapsed|inactive|win.?back|haven.?t bought|dormant|come back|return/.test(lower)) {
    intent = "win_back_lapsed";
  } else if (/vip|platinum|gold|top.tier|exclusive|early access|loyal/.test(lower)) {
    intent = "vip_exclusive";
  } else if (/first.?time|new customer|first order|onboard|convert/.test(lower)) {
    intent = "new_customer_convert";
  } else if (/at.?risk|churn|prevent|save|retain/.test(lower)) {
    intent = "at_risk_save";
  }

  return {
    intent,
    hasDaysInactive,
    hasTier: hasTier.length > 0 ? hasTier : undefined,
    hasDiscount,
    hasLoyalty,
    rawKeywords: words.slice(0, 15),
  };
}

// ─── Segment Builder ─────────────────────────────────────────────────────────

interface SegmentConfig {
  name: string;
  description: string;
  filters: AudienceFilter[];
  predicate: (c: Customer) => boolean;
}

function buildSegmentConfig(parsed: ParsedGoal, customers: Customer[]): SegmentConfig {
  const today = Date.now();
  const dayMs = 86_400_000;

  switch (parsed.intent) {
    case "win_back_lapsed": {
      const threshold = parsed.hasDaysInactive ?? 60;
      return {
        name: `Lapsed Customers (${threshold}d+)`,
        description: `Customers with no purchase in the last ${threshold} days`,
        filters: [
          {
            field: "lastOrderDate",
            operator: "lt",
            value: new Date(today - threshold * dayMs).toISOString().split("T")[0],
            label: `Last order > ${threshold} days ago`,
          },
          {
            field: "orderCount",
            operator: "gte",
            value: 1,
            label: "Has placed at least 1 order",
          },
        ],
        predicate: (c) => {
          const last = new Date(c.lastOrderDate).getTime();
          return (today - last) / dayMs >= threshold && c.orderCount >= 1;
        },
      };
    }

    case "vip_exclusive": {
      const tiers = parsed.hasTier?.includes("gold")
        ? ["gold", "platinum"]
        : ["platinum"];
      return {
        name: "High-Value Members",
        description: "Gold and Platinum tier customers with strong engagement",
        filters: [
          {
            field: "tier",
            operator: "in",
            value: tiers,
            label: `Tier: ${tiers.join(" / ")}`,
          },
          {
            field: "engagementScore",
            operator: "gte",
            value: 70,
            label: "Engagement score ≥ 70",
          },
          {
            field: "status",
            operator: "eq",
            value: "active",
            label: "Currently active",
          },
        ],
        predicate: (c) =>
          tiers.includes(c.tier) &&
          c.engagementScore >= 70 &&
          c.status === "active",
      };
    }

    case "new_customer_convert": {
      return {
        name: "Recent First-Time Buyers",
        description: "New customers who joined in the last 30 days",
        filters: [
          {
            field: "status",
            operator: "eq",
            value: "new",
            label: "Status: new customer",
          },
          {
            field: "orderCount",
            operator: "eq",
            value: 1,
            label: "Exactly 1 order placed",
          },
        ],
        predicate: (c) => c.status === "new" && c.orderCount === 1,
      };
    }

    case "at_risk_save": {
      return {
        name: "At-Risk Customers",
        description: "Customers showing early signs of churn (60–90d inactive)",
        filters: [
          {
            field: "status",
            operator: "eq",
            value: "at_risk",
            label: "Status: at risk",
          },
          {
            field: "orderCount",
            operator: "gte",
            value: 3,
            label: "Placed 3+ orders (worth saving)",
          },
        ],
        predicate: (c) => c.status === "at_risk" && c.orderCount >= 3,
      };
    }

    default: {
      // general_promo — target active customers with decent engagement
      return {
        name: "Engaged Active Customers",
        description: "Active customers with engagement score above 50",
        filters: [
          {
            field: "status",
            operator: "in",
            value: ["active", "new"],
            label: "Status: active or new",
          },
          {
            field: "engagementScore",
            operator: "gte",
            value: 50,
            label: "Engagement score ≥ 50",
          },
        ],
        predicate: (c) =>
          (c.status === "active" || c.status === "new") &&
          c.engagementScore >= 50,
      };
    }
  }
}

// ─── Channel Selector ─────────────────────────────────────────────────────────

/**
 * Picks the best channel based on the segment's preferred-channel distribution
 * and the campaign intent. Mirrors a real multi-armed bandit heuristic.
 */
function selectChannel(
  segment: Customer[],
  intent: CampaignIntent
): CampaignChannel {
  // Count preferred channels in the matched segment
  const counts: Record<CampaignChannel, number> = {
    email: 0,
    sms: 0,
    whatsapp: 0,
    push: 0,
  };
  for (const c of segment) {
    counts[c.preferredChannel as CampaignChannel]++;
  }

  // Intent-specific overrides
  if (intent === "win_back_lapsed") {
    // Email wins for win-back: longer copy, works on disengaged users
    counts.email += 3;
  } else if (intent === "vip_exclusive") {
    // WhatsApp feels personal for VIPs
    counts.whatsapp += 2;
  } else if (intent === "new_customer_convert") {
    // Push notification is timely for new app installs
    counts.push += 2;
  } else if (intent === "at_risk_save") {
    // SMS has highest urgency open rate
    counts.sms += 2;
  }

  // Return channel with highest weighted count
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as CampaignChannel;
}

// ─── Message Variant Drafts ───────────────────────────────────────────────────

/**
 * Generates 3 message variants for the campaign.
 * Each has a distinct tone and predicted CTR.
 * Replace these with LLM-generated copy in production.
 */
function draftVariants(
  parsed: ParsedGoal,
  channel: CampaignChannel,
  campaignId: string,
  segment: Customer[]
): MessageVariant[] {
  const avgSpend = segment.length
    ? Math.round(segment.reduce((s, c) => s + c.avgOrderValue, 0) / segment.length)
    : 2500;

  const variants: MessageVariant[] = [];

  switch (parsed.intent) {
    case "win_back_lapsed": {
      variants.push(
        {
          id: makeId("var"),
          label: "Warm Re-engagement",
          subject: "We miss you — here's something just for you 🌿",
          body: `Hi {{first_name}},\n\nIt's been a while since we last saw you at Velour, and we've been thinking about you.\n\nWe've added some beautiful new pieces since your last visit — and we'd love to welcome you back with a special offer.\n\nUse code COMEBACK15 for 15% off your next order. No minimum spend.\n\nShop now →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.068,
        },
        {
          id: makeId("var"),
          label: "Urgency Nudge",
          subject: "Your exclusive offer expires in 48 hours ⏰",
          body: `Hi {{first_name}},\n\nYour personalised comeback offer is live — but only for 48 more hours.\n\n15% off everything, including our new winter arrivals. We've been updating the collection and there's a lot you haven't seen yet.\n\nDon't let it expire. Shop now →`,
          tone: "urgent",
          channel,
          predictedCtr: 0.091,
        },
        {
          id: makeId("var"),
          label: "New Arrivals Focus",
          subject: "New in: pieces we think you'll love",
          body: `Hi {{first_name}},\n\nSince your last order we've dropped over 40 new styles — including the linen collection and our collaboration pieces.\n\nAs a returning customer you get first access, plus free shipping on your next order.\n\nExplore what's new →`,
          tone: "informational",
          channel,
          predictedCtr: 0.054,
        }
      );
      break;
    }

    case "vip_exclusive": {
      variants.push(
        {
          id: makeId("var"),
          label: "VIP Early Access",
          subject: "Early access — just for you",
          body: `Hi {{first_name}},\n\nAs one of our most valued customers, you're getting first look at our new collection — 48 hours before anyone else.\n\nThis is your private link. No promo code needed; your discount is already applied.\n\nShop your early access →`,
          tone: "exclusive",
          channel,
          predictedCtr: 0.112,
        },
        {
          id: makeId("var"),
          label: "Loyalty Reward",
          subject: "A thank-you from Velour ✨",
          body: `Hi {{first_name}},\n\nYou've spent over ₹${avgSpend.toLocaleString("en-IN")} with us this year — and we want to say thank you properly.\n\nA ₹500 store credit has been added to your account. It's yours to use on anything, with no expiry.\n\nSee what's new →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.098,
        },
        {
          id: makeId("var"),
          label: "Exclusive Preview",
          subject: "Private preview: our next drop 🖤",
          body: `Hi {{first_name}},\n\nYou're invited to our private collection preview — a curated selection that's not yet on the website.\n\nThese pieces sell out fast in public launch. Your early access starts now.\n\nView private preview →`,
          tone: "exclusive",
          channel,
          predictedCtr: 0.105,
        }
      );
      break;
    }

    case "new_customer_convert": {
      variants.push(
        {
          id: makeId("var"),
          label: "Welcome Back",
          subject: "Your next Velour order has a surprise waiting 🎁",
          body: `Hi {{first_name}},\n\nWelcome to the Velour family! We hope you loved your first order.\n\nWe'd love to see you again — so we've set aside a 10% discount on your second purchase. It's our way of saying hello properly.\n\nShop now →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.076,
        },
        {
          id: makeId("var"),
          label: "Loyalty Programme Invite",
          subject: "You're 1 order away from Silver tier",
          body: `Hi {{first_name}},\n\nDid you know Velour members unlock free shipping, early access, and exclusive drops?\n\nYou're already on Bronze tier. One more order takes you to Silver — with free shipping on every order from that point on.\n\nSee your benefits →`,
          tone: "informational",
          channel,
          predictedCtr: 0.082,
        },
        {
          id: makeId("var"),
          label: "Personalised Picks",
          subject: "Based on your last order — we think you'll love these",
          body: `Hi {{first_name}},\n\nWe've curated a few pieces we think you'll love, based on what you ordered last time.\n\nFree shipping on your next order, automatically applied at checkout. No code needed.\n\nSee your picks →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.071,
        }
      );
      break;
    }

    case "at_risk_save": {
      variants.push(
        {
          id: makeId("var"),
          label: "Personalised Save Offer",
          subject: "We don't want to lose you, {{first_name}}",
          body: `Hi {{first_name}},\n\nWe noticed it's been a while — and we don't want to lose you.\n\nWe've created a personalised offer just for you: 20% off your next order + free returns for 60 days.\n\nNo strings. Just our way of saying we value you.\n\nClaim your offer →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.083,
        },
        {
          id: makeId("var"),
          label: "Limited Urgency Offer",
          subject: "⚡ Your exclusive 20% off — 72 hours only",
          body: `Hi {{first_name}},\n\nWe've set aside a 20% discount code for you — it's live right now and valid for 72 hours.\n\nCode: STAYWITHUS20\n\nWe've updated our entire collection since your last visit. Come take a look.\n\nShop before it expires →`,
          tone: "urgent",
          channel,
          predictedCtr: 0.097,
        },
        {
          id: makeId("var"),
          label: "Feedback Request",
          subject: "Can we ask you something?",
          body: `Hi {{first_name}},\n\nWe noticed you haven't shopped with us in a while, and we'd genuinely love to know why.\n\nTake 30 seconds to tell us — and we'll give you ₹300 store credit just for your honest feedback.\n\nShare your thoughts →`,
          tone: "informational",
          channel,
          predictedCtr: 0.061,
        }
      );
      break;
    }

    default: {
      variants.push(
        {
          id: makeId("var"),
          label: "New Arrivals",
          subject: "Fresh drops just landed at Velour 🌿",
          body: `Hi {{first_name}},\n\nOur latest collection is here — and it's our best yet.\n\nNew styles, new colours, same Velour quality. Free shipping on orders over ₹1,500.\n\nShop new arrivals →`,
          tone: "friendly",
          channel,
          predictedCtr: 0.051,
        },
        {
          id: makeId("var"),
          label: "Weekend Flash Sale",
          subject: "This weekend only: up to 30% off selected styles",
          body: `Hi {{first_name}},\n\nOur weekend flash sale is live — up to 30% off across tops, accessories, and our new footwear range.\n\nEnds Sunday midnight. No code needed.\n\nShop the sale →`,
          tone: "urgent",
          channel,
          predictedCtr: 0.074,
        },
        {
          id: makeId("var"),
          label: "Style Guide",
          subject: "How to style the linen collection this season",
          body: `Hi {{first_name}},\n\nOur team has put together a full style guide for the season — featuring our most-loved pieces and how to wear them.\n\nExclusive early access to the guide, plus 10% off anything featured.\n\nRead the guide →`,
          tone: "informational",
          channel,
          predictedCtr: 0.044,
        }
      );
    }
  }

  return variants;
}

// ─── Reasoning Text Builder ───────────────────────────────────────────────────

function buildReasoningText(
  parsed: ParsedGoal,
  segment: Customer[],
  channel: CampaignChannel,
  chosenVariant: MessageVariant
): Omit<AgentReasoning, "steps" | "processingTimeMs"> {
  const intentLabels: Record<CampaignIntent, string> = {
    win_back_lapsed: "win-back lapsed customers",
    vip_exclusive: "reward and engage high-value members",
    new_customer_convert: "convert first-time buyers into repeat customers",
    at_risk_save: "save at-risk customers before churn",
    general_promo: "drive engagement with an active customer broadcast",
  };

  const channelRationales: Record<CampaignChannel, string> = {
    email: "Email selected — highest reach for longer-form copy; preferred by the majority of this segment and optimal for win-back messaging where context matters.",
    sms: "SMS selected — direct and high-urgency; ideal for time-sensitive offers where you need immediate action from a disengaged audience.",
    whatsapp: "WhatsApp selected — high open rates (>85%) and preferred channel for this segment; conversational tone fits the relationship-building goal.",
    push: "Push notification selected — real-time delivery for app-active users; best for timely, short-copy messages driving immediate action.",
  };

  const avgSpend = segment.length
    ? Math.round(segment.reduce((s, c) => s + c.totalSpend, 0) / segment.length)
    : 0;
  const avgEngagement = segment.length
    ? Math.round(segment.reduce((s, c) => s + c.engagementScore, 0) / segment.length)
    : 0;

  const riskFlags: string[] = [];
  if (segment.length < 5) riskFlags.push("Small audience — consider broadening filters");
  if (avgEngagement < 30) riskFlags.push("Low engagement segment — expect below-average open rates");
  if (parsed.intent === "win_back_lapsed" && !parsed.hasDiscount) {
    riskFlags.push("No discount detected — win-back campaigns perform better with an incentive");
  }

  return {
    goalSummary: `Goal interpreted as: ${intentLabels[parsed.intent]}. Identified ${segment.length} customers matching the target profile with an average lifetime spend of ₹${avgSpend.toLocaleString("en-IN")} and an average engagement score of ${avgEngagement}/100. Recommended variant "${chosenVariant.label}" with predicted CTR of ${(chosenVariant.predictedCtr * 100).toFixed(1)}%.`,
    customerInsight: `${segment.length} customers matched across ${new Set(segment.map((c) => c.city)).size} cities. Average engagement: ${avgEngagement}/100. Top tiers: ${[...new Set(segment.map((c) => c.tier))].join(", ")}.`,
    segmentRationale: `Filtered the customer base using ${parsed.intent.replace(/_/g, " ")} criteria. Customers are ranked by recency and engagement score. The ${segment.length}-customer cohort represents the highest-probability responders to this campaign type.`,
    channelRationale: channelRationales[channel],
    riskFlags,
    confidence: Math.min(0.97, 0.65 + segment.length * 0.012 + avgEngagement * 0.002),
  };
}

// ─── Campaign Name Generator ──────────────────────────────────────────────────

function generateCampaignName(parsed: ParsedGoal, segmentSize: number): string {
  const date = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const names: Record<CampaignIntent, string> = {
    win_back_lapsed: `Win-Back Wave · ${segmentSize} customers · ${date}`,
    vip_exclusive: `VIP Exclusive Access · ${segmentSize} members · ${date}`,
    new_customer_convert: `First → Repeat Conversion · ${segmentSize} customers · ${date}`,
    at_risk_save: `Churn Prevention · ${segmentSize} at-risk · ${date}`,
    general_promo: `Engagement Broadcast · ${segmentSize} customers · ${date}`,
  };
  return names[parsed.intent];
}

// ─── Agent Steps Builder ──────────────────────────────────────────────────────

function buildCompletedSteps(startTime: number): AgentStep[] {
  const stepDefs: Array<{ id: AgentStep["id"]; label: string; detail: string }> = [
    { id: "parsing_goal", label: "Parsing campaign goal", detail: "Intent, target behaviour, and success criteria extracted." },
    { id: "analyzing_customers", label: "Analysing customer base", detail: "Scanned 25 customers × purchase history, engagement scores, and recency signals." },
    { id: "building_segment", label: "Building audience segment", detail: "RFM filters and behavioural tags applied to surface highest-value cohort." },
    { id: "drafting_messages", label: "Drafting message variants", detail: "Three channel-specific copy variants generated with tone and CTA optimisation." },
    { id: "selecting_channel", label: "Selecting optimal channel", detail: "Open-rate priors compared across Email / SMS / WhatsApp / Push for this segment." },
    { id: "finalizing", label: "Finalising campaign brief", detail: "Audience, message, channel, and confidence score packaged into a launch-ready plan." },
  ];

  const stepMs = Math.floor((Date.now() - startTime) / stepDefs.length);
  return stepDefs.map((s, i) => ({
    ...s,
    status: "done" as const,
    startedAt: startTime + i * stepMs,
    completedAt: startTime + (i + 1) * stepMs,
  }));
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * runAgent — the primary entry point for the AIRA agent.
 *
 * Takes a natural language goal + the full customer/order dataset,
 * returns a fully-formed Campaign ready for human approval.
 *
 * LLM SWAP: Replace the internals of this function with an LLM call.
 * Keep the signature and return type identical.
 */
export async function runAgent(
  goalText: string,
  customers: Customer[],
  _orders: Order[]  // available for future order-based segmentation
): Promise<Campaign> {
  const startTime = Date.now();

  // ① Parse intent
  const parsed = parseGoal(goalText);

  // ② Build segment
  const segmentConfig = buildSegmentConfig(parsed, customers);
  const matchedCustomers = customers.filter(segmentConfig.predicate);

  // Fallback: if the strict filter is too narrow, relax to active customers
  const effectiveCustomers =
    matchedCustomers.length >= 3
      ? matchedCustomers
      : customers.filter((c) => c.status === "active").slice(0, 8);

  const audience: AudienceSegment = {
    name: segmentConfig.name,
    description: segmentConfig.description,
    filters: segmentConfig.filters,
    estimatedSize: effectiveCustomers.length,
    matchedCustomerIds: effectiveCustomers.map((c) => c.id),
  };

  // ③ Select channel
  const chosenChannel = selectChannel(effectiveCustomers, parsed.intent);

  // ④ Draft variants
  const campaignId = makeId("camp");
  const variants = draftVariants(parsed, chosenChannel, campaignId, effectiveCustomers);

  // ⑤ Pick best variant (highest predicted CTR)
  const bestVariant = variants.reduce((best, v) =>
    v.predictedCtr > best.predictedCtr ? v : best
  );

  // ⑥ Build reasoning
  const reasoningBase = buildReasoningText(parsed, effectiveCustomers, chosenChannel, bestVariant);
  const steps = buildCompletedSteps(startTime);

  const agentReasoning = {
    ...reasoningBase,
    steps,
    processingTimeMs: Date.now() - startTime,
  };

  return {
    id: campaignId,
    goalText,
    name: generateCampaignName(parsed, effectiveCustomers.length),
    status: "pending_approval",
    audience,
    messageVariants: variants,
    chosenVariantId: bestVariant.id,
    chosenChannel,
    agentReasoning,
    createdAt: new Date().toISOString(),
  };
}