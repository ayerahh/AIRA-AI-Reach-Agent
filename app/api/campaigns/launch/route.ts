import { NextResponse } from "next/server";
import { computeCampaignAnalytics } from "@/lib/analytics";
import { dispatchCampaign } from "@/lib/channel-service";
import { getCampaignById, updateCampaign } from "@/lib/store";
import type { LaunchCampaignRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LaunchCampaignRequest;
    const { campaignId, chosenVariantId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    const campaign = getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const variantId = chosenVariantId ?? campaign.chosenVariantId;
    const variant = campaign.messageVariants.find((v) => v.id === variantId);
    if (!variant) {
      return NextResponse.json(
        { success: false, error: "Message variant not found" },
        { status: 400 }
      );
    }

    const segmentSize = campaign.audience.estimatedSize;
    const channel = variant.channel;

    await dispatchCampaign(channel, variant, segmentSize);

    const analytics = computeCampaignAnalytics(
      campaign.id,
      segmentSize,
      channel
    );

    const launchedCampaign = updateCampaign(campaign.id, {
      status: "live",
      chosenVariantId: variantId,
      chosenChannel: channel,
      launchedAt: new Date().toISOString(),
      analytics,
    });

    if (!launchedCampaign) {
      return NextResponse.json(
        { success: false, error: "Failed to update campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: launchedCampaign,
      analytics,
    });
  } catch (error: unknown) {
    console.error("Campaign launch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to launch campaign";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
