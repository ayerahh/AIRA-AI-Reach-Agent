import { NextResponse } from "next/server";
import { getCampaignById, getCommunicationsByCampaign } from "@/lib/store";
import type { CampaignAnalytics, ChannelBreakdown, CampaignChannel } from "@/lib/types";

/**
 * GET /api/campaigns/[id]
 * Returns a single campaign with freshly-computed analytics derived from
 * all Communication records in the store — so the UI can poll this to see
 * live delivery updates as callback receipts arrive from the channel service.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const comms = getCommunicationsByCampaign(id);

  // Recompute analytics live from communication records
  const channelMap: Record<string, ChannelBreakdown> = {};

  let delivered = 0, opened = 0, clicked = 0, failed = 0;

  for (const c of comms) {
    if (!channelMap[c.channel]) {
      channelMap[c.channel] = { channel: c.channel as CampaignChannel, sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 };
    }
    const row = channelMap[c.channel];
    row.sent++;
    if (c.status === "delivered" || c.status === "opened" || c.status === "clicked") { row.delivered++; delivered++; }
    if (c.status === "opened" || c.status === "clicked") { row.opened++; opened++; }
    if (c.status === "clicked") { row.clicked++; clicked++; }
    if (c.status === "failed") { row.failed++; failed++; }
  }

  const totalSent = comms.length;
  const ordersCalculated = Math.round(clicked * 0.1);
  const avgSpend = campaign.audience.estimatedSize > 0
    ? 1200  // conservative fallback; real avg would come from customer data
    : 0;

  const analytics: CampaignAnalytics = {
    campaignId: id,
    totalTargeted: campaign.audience.estimatedSize,
    totalSent,
    delivered,
    opened,
    clicked,
    bounced: 0,
    failed,
    deliveryRate: totalSent > 0 ? delivered / totalSent : 0,
    openRate: delivered > 0 ? opened / delivered : 0,
    clickRate: opened > 0 ? clicked / opened : 0,
    estimatedRevenue: ordersCalculated * avgSpend,
    ordersCalculated,
    channelBreakdown: Object.values(channelMap),
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json({ campaign, analytics });
}
