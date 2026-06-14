import { NextResponse } from "next/server";
import { getCommunicationsByCampaign, getCustomers } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comms = getCommunicationsByCampaign(id);
  const customers = getCustomers();
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const enriched = comms.map((comm) => {
    const customer = customerMap.get(comm.customerId);
    return {
      id: comm.id,
      customerId: comm.customerId,
      customerName: customer?.name ?? comm.customerId,
      channel: comm.channel,
      status: comm.status,
      deliveredAt: comm.deliveredAt ?? null,
      openedAt: comm.openedAt ?? null,
      clickedAt: comm.clickedAt ?? null,
      failureReason: comm.failureReason ?? null,
      sentAt: comm.sentAt ?? null,
    };
  });

  return NextResponse.json({ success: true, communications: enriched });
}
