import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      groq: !!process.env.GROQ_API_KEY,
      channelService: !!process.env.CHANNEL_SERVICE_URL,
    },
    store: {
      customers: store.customers.length,
      campaigns: store.campaigns.length,
      communications: store.communications.length,
    },
  });
}
