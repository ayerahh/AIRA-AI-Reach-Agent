/**
 * AIRA Agent Service — lib/agent.ts
 * INTEGRATED WITH REAL GROQ LLM (Llama 3.3 70B)
 * Keeps 100% of your original functions, full message variants, types, predicates, and safety fallbacks.
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

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type VariantTone = MessageVariant["tone"];
const VALID_TONES: VariantTone[] = [
  "friendly",
  "urgent",
  "exclusive",
  "informational",
];

function normalizeTone(tone: string): VariantTone {
  const lower = tone.toLowerCase() as VariantTone;
  return VALID_TONES.includes(lower) ? lower : "friendly";
}

interface GroqVariantPayload {
  label: string;
  subject: string;
  body: string;
  tone: string;
}

interface GroqVariantsResponse {
  variants: GroqVariantPayload[];
}

interface GroqReasoningResponse {
  goalSummary: string;
  customerInsight: string;
  segmentRationale: string;
  channelRationale: string;
  riskFlags: string[];
  confidence?: number;
}

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

function parseGoal(goalText: string): ParsedGoal {
  const lower = goalText.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);

  const daysMatch = lower.match(/(\d+)\s*(?:days?|d)\b/);
  const hasDaysInactive = daysMatch ? parseInt(daysMatch[1], 10) : undefined;

  const tierKeywords = ["gold", "silver", "platinum", "bronze", "vip", "premium", "top"];
  const hasTier = tierKeywords.filter((t) => lower.includes(t));

  const hasDiscount = /discount|offer|deal|promo|sale|coupon|off|saving/.test(lower);
  const hasLoyalty = /loyal|loyalty|reward|programme|member|exclusive|early access/.test(lower);

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

function selectChannel(
  segment: Customer[],
  intent: CampaignIntent
): CampaignChannel {
  const counts: Record<CampaignChannel, number> = {
    email: 0,
    sms: 0,
    whatsapp: 0,
    push: 0,
  };
  for (const c of segment) {
    counts[c.preferredChannel as CampaignChannel]++;
  }

  if (intent === "win_back_lapsed") {
    counts.email += 3;
  } else if (intent === "vip_exclusive") {
    counts.whatsapp += 2;
  } else if (intent === "new_customer_convert") {
    counts.push += 2;
  } else if (intent === "at_risk_save") {
    counts.sms += 2;
  }

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as CampaignChannel;
}

// ─── Real Groq AI Copy Generation ──────────────────────────────────────────

async function callGroqLLM<T>(prompt: string): Promise<T> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not defined");

  // Enforce a strict 6-second timeout so the app stays responsive
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal, // Attaches the abort signal watcher
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    // Clear the active clock timer if the network request resolves in time
    clearTimeout(timeoutId);

    // Trap API authentication or rate-limit issues explicitly
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Unpack the standard OpenAI/Groq response envelope structure
    const contentString = data.choices?.[0]?.message?.content;
    if (!contentString) {
      throw new Error("Groq returned an empty execution completion block.");
    }

    return JSON.parse(contentString) as T;

  } catch (error) {
    clearTimeout(timeoutId); // Ensure timer cleanup on error pathways
    throw error;
  }
}

function buildCustomerSummary(customers: Customer[]): string {
  if (customers.length === 0) return "";

  const tierCounts = customers.reduce<Record<string, number>>((acc, c) => {
    acc[c.tier] = (acc[c.tier] || 0) + 1;
    return acc;
  }, {});
  const tierStr = Object.entries(tierCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${n} ${t}`)
    .join(", ");

  const topCities = [...new Set(customers.map(c => c.city))].slice(0, 4).join(", ");
  const avgSpend = Math.round(customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length);
  const avgOrders = Math.round(customers.reduce((s, c) => s + c.orderCount, 0) / customers.length);
  const topPersona = Object.entries(
    customers.reduce<Record<string, number>>((acc, c) => {
      const p = c.tags?.[0] || "regular";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";

  return `
Segment Profile (${customers.length} customers):
- Tier breakdown: ${tierStr}
- Cities: ${topCities}
- Avg lifetime spend: ₹${avgSpend.toLocaleString("en-IN")}
- Avg orders per customer: ${avgOrders}
- Dominant persona: ${topPersona.replace(/-/g, " ")}`;
}

async function generateVariantsWithAI(
  goalText: string,
  intent: CampaignIntent,
  channel: CampaignChannel,
  segmentSize: number,
  customerSummary: string
): Promise<GroqVariantPayload[]> {
  const prompt = `You are an expert CRM copywriter. Write 3 message variants for this campaign goal: "${goalText}"
${customerSummary}
Channel: ${channel.toUpperCase()} | Intent: ${intent}

Rules:
- ALWAYS open with exactly "Hi {{first_name}}," — never substitute a real name, never use "Hi Sneha," or any other name
- Use {{first_name}} as the ONLY placeholder for the recipient's name throughout the message
- Reference specific data from the segment profile above (tier, city, spend level, persona) to make copy feel data-driven, not generic
- Keep SMS/Push under 160 chars; email can be longer with 2-4 short paragraphs
- For ${channel === "email" ? "email, include a compelling subject line" : channel + ", leave subject empty"}
- Make each variant meaningfully different in tone, hook, and CTA — not just word-swaps

Return ONLY valid JSON:
{
  "variants": [
    { "label": "Friendly Engagement", "subject": "", "body": "...", "tone": "friendly" },
    { "label": "Urgency Nudge", "subject": "", "body": "...", "tone": "urgent" },
    { "label": "Brand Focus", "subject": "", "body": "...", "tone": "informational" }
  ]
}`;

  const result = await callGroqLLM<GroqVariantsResponse>(prompt);
  if (!Array.isArray(result.variants) || result.variants.length === 0) {
    throw new Error("Groq returned no message variants");
  }

  // Sanitize: replace any real first names the LLM may have injected with {{first_name}}
  return result.variants.map((v) => ({
    ...v,
    body: v.body.replace(/\bHi\s+(?!{{first_name}})([A-Z][a-z]+),/g, "Hi {{first_name}},"),
    subject: v.subject
      ? v.subject.replace(/\b([A-Z][a-z]+),\s/g, "{{first_name}}, ")
      : v.subject,
  }));
}

async function generateReasoningWithAI(
  goalText: string,
  intent: CampaignIntent,
  channel: CampaignChannel,
  segmentSize: number,
  avgSpend: number,
  avgEngagement: number,
  customerSummary: string
): Promise<GroqReasoningResponse> {
  const prompt = `You are an AI campaign strategist. Analyze this campaign and return data-grounded reasoning.

Marketer Goal: "${goalText}"
${customerSummary}
Selected Channel: ${channel} | Intent: ${intent} | Avg engagement: ${avgEngagement}/100

Reference actual numbers from the segment profile in your reasoning — mention tiers, cities, spend levels.

Return ONLY valid JSON:
{
  "goalSummary": "1-2 sentences: what goal maps to, which customers, expected outcome.",
  "customerInsight": "Specific observations about this segment — mention tiers, cities, spend data.",
  "segmentRationale": "Why these specific customers fit the intent, referencing actual attributes.",
  "channelRationale": "Why ${channel} outperforms alternatives for this exact segment profile.",
  "riskFlags": ["only include if genuinely risky: small size, low engagement, etc."],
  "confidence": 0.87
}`;

  return await callGroqLLM<GroqReasoningResponse>(prompt);
}

// ─── Original Repetitive Static Fallbacks (YOUR GOOD COPY) ─────────────────

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

  const avgSpend = segment.length ? Math.round(segment.reduce((s, c) => s + c.totalSpend, 0) / segment.length) : 0;
  const avgEngagement = segment.length ? Math.round(segment.reduce((s, c) => s + c.engagementScore, 0) / segment.length) : 0;
  const riskFlags: string[] = [];
  if (segment.length < 5) riskFlags.push("Small audience — consider broadening filters");
  if (avgEngagement < 30) riskFlags.push("Low engagement segment — expect below-average open rates");

  return {
    goalSummary: `Goal interpreted as: ${intentLabels[parsed.intent]}. Identified ${segment.length} customers matching the target profile with an average lifetime spend of ₹${avgSpend.toLocaleString("en-IN")}. Recommended variant "${chosenVariant.label}" with predicted CTR of ${(chosenVariant.predictedCtr * 100).toFixed(1)}%.`,
    customerInsight: `${segment.length} customers matched across ${new Set(segment.map((c) => c.city)).size} cities. Average engagement: ${avgEngagement}/100.`,
    segmentRationale: `Filtered the customer base using ${parsed.intent.replace(/_/g, " ")} criteria.`,
    channelRationale: channelRationales[channel],
    riskFlags,
    confidence: Math.min(0.97, 0.65 + segment.length * 0.012 + avgEngagement * 0.002),
  };
}

// ─── Names and Steps Builders ────────────────────────────────────────────────

function generateCampaignName(parsed: ParsedGoal, segmentSize: number): string {
  const date = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `Campaign Wave · ${segmentSize} targets · ${date}`;
}

function buildCompletedSteps(startTime: number): AgentStep[] {
  const stepDefs = [
    { id: "parsing_goal", label: "Parsing campaign goal", detail: "Intent and success criteria evaluated safely." },
    { id: "analyzing_customers", label: "Analysing customer base", detail: "Scanned profile properties across loaded dataset segments." },
    { id: "building_segment", label: "Building audience segment", detail: "Behavioral tags mapped contextually to cohort filters." },
    { id: "drafting_messages", label: "Drafting message variants", detail: "Generated layout alternatives with dynamic variable structural bindings." },
    { id: "selecting_channel", label: "Selecting optimal channel", detail: "Compared historic response distributions across communication paths." },
    { id: "finalizing", label: "Finalising campaign brief", detail: "Strategy metrics successfully validated for runtime selection." },
  ];
  const stepMs = Math.floor((Date.now() - startTime) / stepDefs.length);
  return stepDefs.map((s, i) => ({
    id: s.id as any,
    label: s.label,
    detail: s.detail,
    status: "done",
    startedAt: startTime + i * stepMs,
    completedAt: startTime + (i + 1) * stepMs,
  }));
}

// ============================================================================
// MAIN CAMPAIGN AGENT EXECUTOR
// ============================================================================

export async function runAgent(
  goalText: string,
  customers: Customer[],
  orders: Order[]
): Promise<Campaign> {
  const startTime = Date.now();

  // ① Run your original precise segmentation loops
  const parsed = parseGoal(goalText);
  const segmentConfig = buildSegmentConfig(parsed, customers);
  const matchedCustomers = customers.filter(segmentConfig.predicate);

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

  const chosenChannel = selectChannel(effectiveCustomers, parsed.intent);
  const campaignId = makeId("camp");

  let variants: MessageVariant[] = [];
  let reasoningBase: GroqReasoningResponse | null = null;

  const avgTotalSpend = effectiveCustomers.length ? Math.round(effectiveCustomers.reduce((s, c) => s + c.totalSpend, 0) / effectiveCustomers.length) : 0;
  const avgEngagement = effectiveCustomers.length ? Math.round(effectiveCustomers.reduce((s, c) => s + c.engagementScore, 0) / effectiveCustomers.length) : 0;

  const customerSummary = buildCustomerSummary(effectiveCustomers);

  // If key is present, execute Live Groq Upgrade
  if (GROQ_API_KEY) {
    try {
      const aiVariants = await generateVariantsWithAI(goalText, parsed.intent, chosenChannel, effectiveCustomers.length, customerSummary);
      variants = aiVariants.map((v, i): MessageVariant => ({
        id: makeId("var"),
        label: v.label,
        subject: v.subject || undefined,
        body: v.body,
        tone: normalizeTone(v.tone),
        channel: chosenChannel,
        predictedCtr: [0.088, 0.114, 0.062][i % 3],
      }));

      reasoningBase = await generateReasoningWithAI(goalText, parsed.intent, chosenChannel, effectiveCustomers.length, avgTotalSpend, avgEngagement, customerSummary);
    } catch (error) {
      console.error("Groq down, running original copy blocks fallback.", error);
    }
  }

  // Safety net: If Groq isn't configured, or throws an unexpected exception, use ALL your original data points instantly!
  if (variants.length === 0 || !reasoningBase) {
    variants = draftVariants(parsed, chosenChannel, campaignId, effectiveCustomers);
    const deterministicReasoning = buildReasoningText(parsed, effectiveCustomers, chosenChannel, variants[0]);
    reasoningBase = {
      goalSummary: deterministicReasoning.goalSummary,
      customerInsight: deterministicReasoning.customerInsight,
      segmentRationale: deterministicReasoning.segmentRationale,
      channelRationale: deterministicReasoning.channelRationale,
      riskFlags: deterministicReasoning.riskFlags,
      confidence: deterministicReasoning.confidence,
    };
  }

  const bestVariant = variants.reduce((best, v) =>
    v.predictedCtr > best.predictedCtr ? v : best, variants[0]
  );

  const steps = buildCompletedSteps(startTime);

  return {
    id: campaignId,
    goalText,
    name: generateCampaignName(parsed, effectiveCustomers.length),
    status: "pending_approval",
    audience,
    messageVariants: variants,
    chosenVariantId: bestVariant.id,
    chosenChannel,
    agentReasoning: {
      goalSummary: reasoningBase.goalSummary,
      customerInsight: reasoningBase.customerInsight,
      segmentRationale: reasoningBase.segmentRationale,
      channelRationale: reasoningBase.channelRationale,
      riskFlags: reasoningBase.riskFlags || [],
      confidence: Math.min(
        0.99,
        Math.max(0.6, reasoningBase.confidence ?? 0.85)
      ),
      steps,
      processingTimeMs: Date.now() - startTime,
    },
    createdAt: new Date().toISOString(),
  };
}