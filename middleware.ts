import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 10);
  const res = NextResponse.next();

  // Propagate request ID so logs can be correlated end-to-end
  res.headers.set("x-request-id", requestId);

  // Structured access log — visible in Vercel Functions logs
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
    })
  );

  return res;
}

export const config = {
  matcher: "/api/:path*",
};
