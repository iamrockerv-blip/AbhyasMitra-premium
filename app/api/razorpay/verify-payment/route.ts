/**
 * POST /api/razorpay/verify-payment
 * Server-side HMAC-SHA256 signature verification.
 * SECURITY CRITICAL: Never trust client-side "success" alone.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const body = await request.json();
    const { paymentId, orderId, signature, productId } = body;

    if (!paymentId || !orderId || !signature || !productId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const receivedBuf = Buffer.from(signature, "hex");

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      console.error("[verify-payment] Signature mismatch", { userId, orderId });
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Write purchase to Firestore directly to support local testing without a webhook tunnel!
    let userEmail = "unknown";
    try {
      const userRecord = await adminAuth().getUser(userId);
      userEmail = userRecord.email || userId;
    } catch { /* ignore */ }

    // Check if purchase already recorded
    const existing = await adminDb()
      .collection("purchases")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    let purchaseId = "";
    if (existing.empty) {
      const docRef = await adminDb().collection("purchases").add({
        userId,
        productId,
        orderId,
        paymentId,
        amount: 99, // Fallback price
        userEmail,
        purchasedAt: new Date(),
        status: "completed",
      });
      purchaseId = docRef.id;
    } else {
      purchaseId = existing.docs[0].id;
    }

    return NextResponse.json({ success: true, purchaseId });
  } catch (error) {
    console.error("[verify-payment] Error:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
