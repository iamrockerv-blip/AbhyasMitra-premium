/**
 * GET /api/pdf/[purchaseId]
 * Streams PDF bytes after verifying auth token and purchase ownership.
 * Raw Storage URL is never sent to the client.
 *
 * FILE RESOLUTION STRATEGY:
 * 1. First, try Firebase Storage (for files uploaded via admin upload-product)
 * 2. If the storagePath matches a file in public/, fetch it via HTTP from the
 *    app's own origin (works on Vercel where fs access to public/ is unavailable)
 * 3. As last fallback, try local filesystem (works in dev)
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * Fetch a file from the public/ folder by making an HTTP request
 * to the app's own origin. This works on Vercel where serverless functions
 * can't read from the public/ directory via the filesystem.
 */
async function fetchFromPublicFolder(
  fileName: string,
  request: NextRequest
): Promise<Buffer | null> {
  try {
    // Build the URL from the incoming request's origin
    const origin = request.nextUrl.origin;
    const fileUrl = `${origin}/${encodeURIComponent(fileName)}`;
    console.log("[pdf] Fetching from public folder via URL:", fileUrl);

    const res = await fetch(fileUrl, {
      redirect: "manual",
    });

    if (!res.ok) {
      console.warn("[pdf] Fetch from public folder status not ok:", res.status);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    // Make sure we're actually getting a PDF, not an HTML error page
    if (contentType.includes("text/html")) {
      console.warn("[pdf] Fetch from public folder returned HTML instead of PDF. Content-Type:", contentType);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error("[pdf] Fetch from public folder failed with error:", err);
    return null;
  }
}

/**
 * Try to read from local filesystem (works in dev, and on Vercel if bundled via outputFileTracingIncludes)
 */
function readFromLocalFs(fileName: string): Buffer | null {
  try {
    const fs = require("fs");
    const path = require("path");
    const localPath = path.join(process.cwd(), "public", fileName);
    console.log("[pdf] Attempting local fs read from:", localPath);
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath);
      console.log("[pdf] Successfully read file from local fs:", localPath);
      return data;
    } else {
      console.warn("[pdf] File does not exist on local fs:", localPath);
    }
    return null;
  } catch (err: any) {
    console.error("[pdf] Local fs read failed with error:", err);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const { purchaseId } = await params;
    console.log("[pdf] GET request received for purchaseId:", purchaseId);

    // ─── Auth check ───────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[pdf] Authorization header missing or invalid format");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(token);
    } catch (authErr: any) {
      console.error("[pdf] Auth verifyIdToken failed:", authErr.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid;

    // ─── Verify purchase ownership ────────────────────────────────────────
    const purchaseSnap = await adminDb().collection("purchases").doc(purchaseId).get();

    if (!purchaseSnap.exists) {
      console.warn("[pdf] Purchase not found in database:", purchaseId);
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const purchase = purchaseSnap.data()!;

    if (purchase.userId !== userId) {
      console.warn("[pdf] Unauthorized access attempt", { requestUserId: userId, purchaseOwnerId: purchase.userId, purchaseId });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (purchase.status !== "completed") {
      console.warn("[pdf] Purchase is not in completed status:", purchase.status);
      return NextResponse.json({ error: "Purchase not completed" }, { status: 403 });
    }

    // ─── Resolve the PDF file ─────────────────────────────────────────────
    let fileContents: Buffer | null = null;
    let storagePath: string = "";

    if (purchase.productId === "mock-1") {
      // Mock product — use hardcoded filename
      storagePath = "DM Complete QB without pass.pdf";
    } else {
      // Real product — get storage path from Firestore
      const productSnap = await adminDb().collection("products").doc(purchase.productId).get();

      if (!productSnap.exists) {
        console.warn("[pdf] Product not found for purchase:", purchase.productId);
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      storagePath = productSnap.data()!.storagePath;
      if (!storagePath) {
        console.warn("[pdf] Product does not have a storagePath defined:", purchase.productId);
        return NextResponse.json({ error: "PDF not available" }, { status: 404 });
      }
    }

    console.log("[pdf] Resolved storage path to attempt loading:", storagePath);

    // Strategy 1: Try Firebase Storage first (for files uploaded via admin panel)
    try {
      const bucket = adminStorage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (exists) {
        const [downloaded] = await file.download();
        fileContents = downloaded;
        console.log("[pdf] Served from Firebase Storage:", storagePath);
      } else {
        console.log("[pdf] File does not exist in Firebase Storage bucket:", storagePath);
      }
    } catch (err: any) {
      console.warn("[pdf] Firebase Storage attempt failed:", err.message);
    }

    // Strategy 2: Try local filesystem (works in dev and on Vercel if bundled via outputFileTracingIncludes)
    if (!fileContents) {
      fileContents = readFromLocalFs(storagePath);
      if (fileContents) {
        console.log("[pdf] Served from local filesystem:", storagePath);
      }
    }

    // Strategy 3: Try fetching from public/ folder via HTTP (last resort fallback)
    if (!fileContents) {
      fileContents = await fetchFromPublicFolder(storagePath, request);
      if (fileContents) {
        console.log("[pdf] Served from public/ folder via HTTP:", storagePath);
      }
    }

    // All strategies exhausted
    if (!fileContents) {
      console.error("[pdf] All file resolution strategies failed for:", storagePath);
      return NextResponse.json(
        { error: "PDF file not found. Please contact support." },
        { status: 404 }
      );
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
    console.error("[pdf] Internal server error in PDF API route:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
