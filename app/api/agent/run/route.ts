export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { addCampaign, getCustomers, getOrders } from "@/lib/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { RunAgentRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    // 10 campaign builds per IP per minute
    const { allowed, remaining } = rateLimit(getClientIp(req), {
      limit: 10,
      windowMs: 60_000,
    });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests — wait a moment and try again." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const body = (await req.json()) as RunAgentRequest;
    const goalText = body.goalText?.trim();

    if (!goalText) {
      return NextResponse.json(
        { success: false, error: "Goal is required" },
        { status: 400 }
      );
    }

    if (goalText.length < 5) {
      return NextResponse.json(
        { success: false, error: "Goal is too short — describe what you want to achieve." },
        { status: 400 }
      );
    }

    if (goalText.length > 500) {
      return NextResponse.json(
        { success: false, error: "Goal must be under 500 characters." },
        { status: 400 }
      );
    }

    const customers = getCustomers();
    const orders = getOrders();
    const campaign = await runAgent(goalText, customers, orders);
    addCampaign(campaign);

    return NextResponse.json({ success: true, campaign });
  } catch (error: unknown) {
    console.error("Agent run error:", error);
    const message =
      error instanceof Error ? error.message : "Agent reasoning failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
