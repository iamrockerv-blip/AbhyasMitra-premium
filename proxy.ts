/**
 * Next.js Middleware — Admin Route Protection
 *
 * Protects /admin/* routes at the edge layer.
 * Reads the admin session cookie for a quick check.
 * The actual admin verification is always re-confirmed server-side in API routes.
 *
 * Note: Firebase Auth tokens can't be verified at the Edge without the Admin SDK
 * (which uses Node.js APIs). We use a lightweight session cookie strategy:
 * - On admin login, we set a `admin_session` cookie with the ID token
 * - Middleware checks for this cookie's presence (not its validity — that's done in API routes)
 * - If cookie is absent, redirect to /admin/login
 */
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin/* routes except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("admin_session");

    if (!sessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
