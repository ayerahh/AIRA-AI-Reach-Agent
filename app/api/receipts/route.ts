import { NextResponse } from "next/server";
import {
  getCommunicationById,
  getCommunicationsByCampaign,
  getCampaignById,
  updateCampaign,
  updateCommunicationStatus,
} from "@/lib/store";
import type { CommunicationStatus } from "@/lib/types";

interface ReceiptPayload {
  commId: string;
  campaignId: string;
  status: CommunicationStatus;
  timestamp?: string;
  failureReason?: string;
}

/**
 * POST /api/receipts
 * Receives async delivery/open/click/failure callbacks from the channel service.
 * Updates individual Communication records and recalculates live campaign analytics.
 */
export async function POST(req: Request) {
  try {
    // Verify webhook secret if configured — prevents fake receipt injection
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const incoming = req.headers.get("x-webhook-secret");
      if (incoming !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await req.json()) as ReceiptPayload;
    const { commId, campaignId, status, timestamp, failureReason } = body;

    if (!commId || !campaignId || !status) {
      return NextResponse.json({ error: "commId, campaignId, and status are required" }, { status: 400 });
    }

    const comm = getCommunicationById(commId);
    if (!comm) {
      return NextResponse.json({ error: "Communication not found" }, { status: 404 });
    }

    // Idempotency guard — don't downgrade a terminal status (clicked > opened > delivered)
    const statusRank: Record<string, number> = {
      queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4, failed: -1,
    };
    const currentRank = statusRank[comm.status] ?? 0;
    const incomingRank = statusRank[status] ?? 0;
    if (incomingRank <= currentRank && comm.status !== "failed") {
      return NextResponse.json({ ok: true, skipped: true, commId, status });
    }

    // Update the individual communication record
    updateCommunicationStatus(commId, status, { timestamp, failureReason });

    // Recalculate campaign analytics from the live communication dataset
    const allComms = getCommunicationsByCampaign(campaignId);
    const campaign = getCampaignById(campaignId);

    if (campaign && allComms.length > 0) {
      const total = allComms.length;
      const delivered = allComms.filter(c =>
        ["delivered", "opened", "clicked"].includes(c.status)
      ).length;
      const opened = allComms.filter(c =>
        ["opened", "clicked"].includes(c.status)
      ).length;
      const clicked = allComms.filter(c => c.status === "clicked").length;
      const failed = allComms.filter(c => c.status === "failed").length;
      const bounced = failed;
      const ordersCalculated = Math.floor(clicked * 0.1);
      const estimatedRevenue = ordersCalculated * 2499;

      updateCampaign(campaignId, {
        analytics: {
          ...(campaign.analytics ?? {
            campaignId,
            totalTargeted: total,
            totalSent: total,
            channelBreakdown: [],
          }),
          campaignId,
          totalTargeted: total,
          totalSent: total,
          delivered,
          opened,
          clicked,
          failed,
          bounced,
          deliveryRate: total > 0 ? delivered / total : 0,
          openRate: delivered > 0 ? opened / delivered : 0,
          clickRate: opened > 0 ? clicked / opened : 0,
          ordersCalculated,
          estimatedRevenue,
          computedAt: new Date().toISOString(),
          channelBreakdown: campaign.analytics?.channelBreakdown ?? [],
        },
      });
    }

    return NextResponse.json({ ok: true, commId, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Receipt processing failed";
    console.error("[receipts] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
