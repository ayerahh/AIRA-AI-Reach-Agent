import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { addCampaign, getCustomers, getOrders } from "@/lib/store";
import type { RunAgentRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RunAgentRequest;
    const goalText = body.goalText?.trim();

    if (!goalText) {
      return NextResponse.json(
        { success: false, error: "Goal is required" },
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
