import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const minEngagement = searchParams.get("minEngagement");

    let customers = getCustomers();

    if (tier) {
      customers = customers.filter((c) => c.tier === tier);
    }
    if (status) {
      customers = customers.filter((c) => c.status === status);
    }
    if (city) {
      customers = customers.filter((c) =>
        c.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    if (minEngagement) {
      const min = parseFloat(minEngagement);
      if (!isNaN(min)) {
        customers = customers.filter((c) => c.engagementScore >= min);
      }
    }

    return NextResponse.json(customers);
  } catch (error: unknown) {
    console.error("Customers list error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
