import { NextResponse } from "next/server";
import { getCampaigns } from "@/lib/store";

export async function GET() {
  try {
    const campaigns = getCampaigns().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    console.error("Campaigns list error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
