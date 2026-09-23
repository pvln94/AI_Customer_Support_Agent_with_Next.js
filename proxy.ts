// LAYMAN: The bouncer at the admin door — asks for the username/password before letting anyone into /admin or /api/admin/* (Next.js 16 calls this file proxy.ts instead of middleware).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// WHY: Basic Auth gate for the prototype admin area (not production-grade).
// Next.js 16: middleware is now called Proxy — file is proxy.ts.
function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
  if (!needsAuth) return NextResponse.next();

  const user = process.env.ADMIN_USER ?? "";
  const pass = process.env.ADMIN_PASSWORD ?? "";
  if (!user || !pass) return unauthorized();

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return unauthorized();
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  } catch {
    return unauthorized();
  }
  const idx = decoded.indexOf(":");
  const u = idx >= 0 ? decoded.slice(0, idx) : decoded;
  const p = idx >= 0 ? decoded.slice(idx + 1) : "";
  if (!timingSafeEqual(u, user) || !timingSafeEqual(p, pass)) return unauthorized();
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
