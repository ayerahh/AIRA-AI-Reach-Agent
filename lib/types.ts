/**
 * AIRA — AI Reach Agent
 * Core domain types. All IDs are string UUIDs or prefixed slugs.
 * These types flow from seed → agent → campaign → channel → analytics.
 */

// ─── Customer ────────────────────────────────────────────────────────────────

export type CustomerTier = "bronze" | "silver" | "gold" | "platinum";
export type CustomerStatus = "active" | "lapsed" | "new" | "at_risk";
export type PreferredChannel = "email" | "sms" | "whatsapp" | "push";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tier: CustomerTier;
  status: CustomerStatus;
  totalSpend: number;          // lifetime spend in ₹
  orderCount: number;
  avgOrderValue: number;
  lastOrderDate: string;       // ISO date string
  joinedDate: string;          // ISO date string
  preferredChannel: PreferredChannel;
  tags: string[];              // e.g. ["loyal", "high-aov", "inactive-60d"]
  /** 0–100: how likely they are to respond to a campaign */
  engagementScore: number;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export type OrderStatus = "delivered" | "returned" | "cancelled" | "pending";
export type ProductCategory =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "accessories"
  | "footwear"
  | "coffee"
  | "merchandise";

export interface OrderItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  orderDate: string;           // ISO date string
  deliveryDate?: string;
  channel: "web" | "app" | "store";
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "agent_thinking"
  | "pending_approval"
  | "launching"
  | "live"
  | "completed"
  | "failed";

export type CampaignChannel = "email" | "sms" | "whatsapp" | "push";

export interface AudienceSegment {
  name: string;
  description: string;
  filters: AudienceFilter[];
  estimatedSize: number;
  matchedCustomerIds: string[];
}

export interface AudienceFilter {
  field: keyof Customer | string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: string | number | string[];
  label: string;              // human-readable description, e.g. "Spent over ₹5,000"
}

export interface MessageVariant {
  id: string;
  label: string;              // e.g. "Warm Re-engagement"
  subject?: string;           // for email
  body: string;
  tone: "friendly" | "urgent" | "exclusive" | "informational";
  channel: CampaignChannel;
  /** Predicted open/click rate from agent reasoning */
  predictedCtr: number;
}

export interface Campaign {
  id: string;
  goalText: string;            // original natural language goal from user
  name: string;                // agent-generated campaign name
  status: CampaignStatus;
  audience: AudienceSegment;
  messageVariants: MessageVariant[];
  chosenVariantId: string;
  chosenChannel: CampaignChannel;
  scheduledAt?: string;        // ISO datetime
  launchedAt?: string;
  completedAt?: string;
  agentReasoning: AgentReasoning;
  analytics?: CampaignAnalytics;
  createdAt: string;
}

// ─── Agent Reasoning ─────────────────────────────────────────────────────────

export type AgentThinkingStep =
  | "parsing_goal"
  | "analyzing_customers"
  | "building_segment"
  | "drafting_messages"
  | "selecting_channel"
  | "finalizing"
  | "complete"
  | "error";

export interface AgentStep {
  id: AgentThinkingStep;
  label: string;
  detail: string;
  status: "pending" | "running" | "done" | "error";
  startedAt?: number;          // Date.now()
  completedAt?: number;
}

export interface AgentReasoning {
  goalSummary: string;
  customerInsight: string;
  segmentRationale: string;
  channelRationale: string;
  riskFlags: string[];
  confidence: number;          // 0–1
  steps: AgentStep[];
  processingTimeMs: number;
}

// ─── Communication (individual message send) ─────────────────────────────────

export type CommunicationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed";

export interface Communication {
  id: string;
  campaignId: string;
  customerId: string;
  channel: CampaignChannel;
  variantId: string;
  status: CommunicationStatus;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ChannelBreakdown {
  channel: CampaignChannel;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  totalTargeted: number;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  deliveryRate: number;        // 0–1
  openRate: number;
  clickRate: number;
  estimatedRevenue: number;    // ₹
  ordersCalculated: number;
  channelBreakdown: ChannelBreakdown[];
  computedAt: string;
}

// ─── API Shapes ──────────────────────────────────────────────────────────────

export interface RunAgentRequest {
  goalText: string;
}

export interface RunAgentResponse {
  success: boolean;
  campaign?: Campaign;
  error?: string;
}

export interface LaunchCampaignRequest {
  campaignId: string;
  chosenVariantId?: string;    // optional override
}

export interface LaunchCampaignResponse {
  success: boolean;
  campaign?: Campaign;
  analytics?: CampaignAnalytics;
  error?: string;
}

// ─── In-memory store shape ────────────────────────────────────────────────────

export interface AppStore {
  customers: Customer[];
  orders: Order[];
  campaigns: Campaign[];
  communications: Communication[];
}
