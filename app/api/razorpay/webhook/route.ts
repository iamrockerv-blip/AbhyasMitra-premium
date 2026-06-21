/**
 * POST /api/razorpay/webhook
 * SOURCE OF TRUTH for payment confirmation.
 * Writes purchase record to Firestore via Admin SDK.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.event !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { id: paymentId, order_id: orderId, amount, notes } = payment;
    const productId: string = notes?.productId;
    const userId: string = notes?.userId;

    if (!productId || !orderId || !paymentId) {
      return NextResponse.json({ error: "Missing payment data" }, { status: 400 });
    }

    // Idempotency check
    const existing = await adminDb()
      .collection("purchases")
      .where("orderId", "==", orderId)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ received: true });
    }

    let userEmail = "unknown";
    if (userId && userId !== "anonymous") {
      try {
        const userRecord = await adminAuth().getUser(userId);
        userEmail = userRecord.email || userId;
      } catch { /* ignore */ }
    }

    await adminDb().collection("purchases").add({
      userId: userId || "anonymous",
      productId,
      orderId,
      paymentId,
      amount: Math.round(amount / 100),
      userEmail,
      purchasedAt: FieldValue.serverTimestamp(),
      status: "completed",
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
