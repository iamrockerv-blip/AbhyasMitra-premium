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

    const res = await fetch(fileUrl, {
      // Don't follow redirects to error pages
      redirect: "manual",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    // Make sure we're actually getting a PDF, not an HTML error page
    if (contentType.includes("text/html")) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Try to read from local filesystem (works in dev, may work on some hosts)
 */
function readFromLocalFs(fileName: string): Buffer | null {
  try {
    const fs = require("fs");
    const path = require("path");
    const localPath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const { purchaseId } = await params;

    // ─── Auth check ───────────────────────────────────────────────────────
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

    // ─── Verify purchase ownership ────────────────────────────────────────
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
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      storagePath = productSnap.data()!.storagePath;
      if (!storagePath) {
        return NextResponse.json({ error: "PDF not available" }, { status: 404 });
      }
    }

    // Strategy 1: Try Firebase Storage first (for files uploaded via admin panel)
    try {
      const bucket = adminStorage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (exists) {
        const [downloaded] = await file.download();
        fileContents = downloaded;
        console.log("[pdf] Served from Firebase Storage:", storagePath);
      }
    } catch (err: any) {
      console.warn("[pdf] Firebase Storage attempt failed:", err.message);
    }

    // Strategy 2: Try fetching from public/ folder via HTTP
    // (works on Vercel where files in public/ are served by CDN)
    if (!fileContents) {
      fileContents = await fetchFromPublicFolder(storagePath, request);
      if (fileContents) {
        console.log("[pdf] Served from public/ folder via HTTP:", storagePath);
      }
    }

    // Strategy 3: Try local filesystem (dev environment fallback)
    if (!fileContents) {
      fileContents = readFromLocalFs(storagePath);
      if (fileContents) {
        console.log("[pdf] Served from local filesystem:", storagePath);
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
    console.error("[pdf] Error:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
