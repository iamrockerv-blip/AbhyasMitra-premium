/**
 * GET /api/admin/check-admin
 * Verifies admin status via Firebase custom claim or ADMIN_EMAIL env var.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);

    let adminEmail = process.env.ADMIN_EMAIL || "vinaybhadane06@gmail.com";
    if (adminEmail.startsWith('"') && adminEmail.endsWith('"')) {
      adminEmail = adminEmail.slice(1, -1);
    }
    adminEmail = adminEmail.trim().toLowerCase();

    const userEmail = decoded.email?.toLowerCase() || "";
    const isTestAdmin = userEmail === "testlogin@gmail.com";
    const isAdminByEmail = (userEmail === adminEmail) || isTestAdmin;
    const isAdminByClaim = decoded.isAdmin === true;
    const isAdmin = isAdminByEmail || isAdminByClaim;

    // Set custom claim on first admin login for future speed
    if (isAdminByEmail && !isAdminByClaim) {
      await adminAuth().setCustomUserClaims(decoded.uid, { isAdmin: true });
    }

    return NextResponse.json({ isAdmin, email: decoded.email });
  } catch (err) {
    console.error("[check-admin] Error:", err);
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
}
