import { NextResponse } from "next/server";
import { computeCampaignAnalytics } from "@/lib/analytics";
import { callChannelService } from "@/lib/channel-service";
import {
  getCampaignById,
  updateCampaign,
  addCommunications,
} from "@/lib/store";
import type { CampaignAnalytics, Communication, LaunchCampaignRequest } from "@/lib/types";

// Prevent double-launch for the same campaign (survives within a single process lifetime)
const launchedCampaigns = new Set<string>();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LaunchCampaignRequest;
    const { campaignId, chosenVariantId } = body;

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });
    }

    if (launchedCampaigns.has(campaignId)) {
      return NextResponse.json(
        { success: false, error: "Campaign has already been launched." },
        { status: 409 }
      );
    }

    const campaign = getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }

    const variantId = chosenVariantId ?? campaign.chosenVariantId;
    const variant = campaign.messageVariants.find((v) => v.id === variantId);
    if (!variant) {
      return NextResponse.json({ success: false, error: "Message variant not found" }, { status: 400 });
    }

    launchedCampaigns.add(campaignId);

    const { audience } = campaign;
    const channel = variant.channel;

    // Create one Communication record per matched customer (capped at 200 for in-memory demo)
    const recipientIds = audience.matchedCustomerIds.slice(0, 200);
    const now = new Date().toISOString();

    const communications: Communication[] = recipientIds.map((customerId) => ({
      id: `comm_${campaignId}_${customerId}`,
      campaignId,
      customerId,
      channel,
      variantId,
      status: "queued",
      sentAt: now,
    }));

    addCommunications(communications);

    // Build initial analytics estimate (will be overwritten by real callback data)
    const initialAnalytics = computeCampaignAnalytics(
      campaignId,
      recipientIds.length,
      channel
    ) as CampaignAnalytics;

    const launched = updateCampaign(campaignId, {
      status: "live",
      chosenVariantId: variantId,
      chosenChannel: channel,
      launchedAt: now,
      analytics: initialAnalytics,
    });

    if (!launched) {
      return NextResponse.json({ success: false, error: "Failed to update campaign" }, { status: 500 });
    }

    // Dispatch to channel service (fire-and-forget — callbacks arrive at /api/receipts)
    const messages = recipientIds.map((customerId) => ({
      id: `comm_${campaignId}_${customerId}`,
      campaignId,
      customerId,
      channel,
      body: variant.body,
    }));

    // We don't await — response goes back to client immediately while channel service
    // processes asynchronously and POSTs delivery/open/click events to /api/receipts
    callChannelService(messages, campaignId).catch((err) => {
      console.warn("[launch] Channel service unreachable:", err.message);
      // Graceful degradation: analytics already seeded from initial estimate above
    });

    return NextResponse.json({
      success: true,
      campaign: launched,
      analytics: initialAnalytics,
      dispatched: recipientIds.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to launch campaign";
    console.error("[launch] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
