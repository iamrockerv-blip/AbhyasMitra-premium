/**
 * GET /api/pdf/[purchaseId]
 * Streams PDF bytes after verifying auth token and purchase ownership.
 * Raw Storage URL is never sent to the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const { purchaseId } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid;

    // Verify purchase ownership
    const purchaseSnap = await adminDb().collection("purchases").doc(purchaseId).get();

    if (!purchaseSnap.exists) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const purchase = purchaseSnap.data()!;

    if (purchase.userId !== userId) {
      console.warn("[pdf] Unauthorized access attempt", { requestUserId: userId, purchaseId });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (purchase.status !== "completed") {
      return NextResponse.json({ error: "Purchase not completed" }, { status: 403 });
    }

    let fileContents: Buffer;
    const isMock = purchase.productId === "mock-1";

    if (isMock) {
      const fs = require("fs");
      const path = require("path");
      const localPath = path.join(process.cwd(), "public", "DM Complete QB without pass.pdf");
      if (fs.existsSync(localPath)) {
        fileContents = fs.readFileSync(localPath);
      } else {
        return NextResponse.json({ error: "Local mock PDF file not found" }, { status: 404 });
      }
    } else {
      // Get product storage path
      const productSnap = await adminDb().collection("products").doc(purchase.productId).get();

      if (!productSnap.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const storagePath: string = productSnap.data()!.storagePath;
      if (!storagePath) {
        return NextResponse.json({ error: "PDF not available" }, { status: 404 });
      }

      try {
        // Stream PDF from private Storage path — Storage URL never exposed to client
        const bucket = adminStorage().bucket();
        const file = bucket.file(storagePath);

        const [exists] = await file.exists();
        if (!exists) {
          return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const [downloaded] = await file.download();
        fileContents = downloaded;
      } catch (err: any) {
        console.warn("[pdf] Storage access failed, using local fallback:", err.message);
        const fs = require("fs");
        const path = require("path");
        const localPath = path.join(process.cwd(), "public", "DM Complete QB without pass.pdf");
        if (fs.existsSync(localPath)) {
          fileContents = fs.readFileSync(localPath);
        } else {
          return NextResponse.json({ error: "Failed to download PDF from storage" }, { status: 500 });
        }
      }
    }

    return new NextResponse(new Uint8Array(fileContents), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[pdf] Error:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
