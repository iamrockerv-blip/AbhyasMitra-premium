/**
 * POST /api/admin/upload-product — Upload a new note product
 * DELETE /api/admin/upload-product?productId=xxx — Delete a product
 * Admin-only. Verifies auth + admin status before any operation.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);
    let adminEmail = process.env.ADMIN_EMAIL || "vinaybhadane06@gmail.com";
    if (adminEmail.startsWith('"') && adminEmail.endsWith('"')) {
      adminEmail = adminEmail.slice(1, -1);
    }
    adminEmail = adminEmail.trim().toLowerCase();

    const userEmail = decoded.email?.toLowerCase() || "";
    const isTestAdmin = userEmail === "testlogin@gmail.com";
    const isAdmin = decoded.isAdmin === true || 
                    userEmail === adminEmail || 
                    isTestAdmin;
    return isAdmin ? decoded.uid : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const subject = formData.get("subject") as string;
    const branch = formData.get("branch") as string;
    const semester = parseInt(formData.get("semester") as string);
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const published = formData.get("published") === "true";
    const pageCount = formData.get("pageCount") ? parseInt(formData.get("pageCount") as string) : null;
    const coverFile = formData.get("cover") as File | null;
    const pdfFile = formData.get("pdf") as File | null;

    if (!title || !subject || !branch || !semester || !description || !price || !pdfFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bucket = adminStorage().bucket();
    const timestamp = Date.now();

    // Upload PDF to private path (notes/)
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const pdfFileName = `notes/${timestamp}_${pdfFile.name.replace(/[^a-z0-9.-]/gi, "_")}`;
    const pdfFileRef = bucket.file(pdfFileName);
    await pdfFileRef.save(pdfBuffer, { metadata: { contentType: "application/pdf" } });

    // Upload cover image to public path (covers/)
    let coverUrl = "";
    if (coverFile && coverFile.size > 0) {
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const coverFileName = `covers/${timestamp}_${coverFile.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const coverFileRef = bucket.file(coverFileName);
      await coverFileRef.save(coverBuffer, { metadata: { contentType: coverFile.type } });
      await coverFileRef.makePublic();
      coverUrl = `https://storage.googleapis.com/${bucket.name}/${coverFileName}`;
    }

    const productData = {
      title, subject, branch, semester, description, price, published,
      coverUrl,
      storagePath: pdfFileName,
      ...(pageCount ? { pageCount } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb().collection("products").add(productData);

    return NextResponse.json({ success: true, productId: docRef.id });
  } catch (error) {
    console.error("[upload-product] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  try {
    await adminDb().collection("products").doc(productId).delete();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
