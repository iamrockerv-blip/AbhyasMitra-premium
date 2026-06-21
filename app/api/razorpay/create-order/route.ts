/**
 * POST /api/razorpay/create-order
 * Creates a Razorpay order for a given product.
 */
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

// Force dynamic to prevent static build-time execution
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const decoded = await adminAuth().verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        // Allow unauthenticated order creation
      }
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    let product;
    if (productId === "mock-1") {
      product = {
        title: "Discrete Mathematics (DM) — Complete Question Bank with Solutions",
        price: 99,
        published: true
      };
    } else {
      const productRef = adminDb().collection("products").doc(productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      product = productSnap.data()!;
    }

    if (!product.published) {
      return NextResponse.json({ error: "Product is not available" }, { status: 400 });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(product.price * 100),
      currency: "INR",
      receipt: `abhyasmitra_${productId}_${Date.now()}`,
      notes: {
        productId,
        productTitle: product.title,
        userId: userId || "anonymous",
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("[create-order] Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
