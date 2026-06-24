import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/admin/public-files
 *
 * Returns a list of files in the project.
 *
 * Security: Only accessible to admin users (checked via ID token verification).
 */

interface PublicFile {
  name: string;
  size: number;
  type: string;       // file extension
  path: string;       // path/URL to the file
  isDirectory: boolean;
  modifiedAt: string;  // ISO date string
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
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
    
    return decoded.isAdmin === true || 
           userEmail === adminEmail || 
           isTestAdmin;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pdfStoreDir = path.join(process.cwd(), "pdf-store");
    const publicDir = path.join(process.cwd(), "public");

    const files: PublicFile[] = [];

    // Scan pdf-store directory (for private PDFs)
    if (fs.existsSync(pdfStoreDir)) {
      const entries = fs.readdirSync(pdfStoreDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.name.startsWith(".")) continue;
        const filePath = path.join(pdfStoreDir, entry.name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(entry.name).toLowerCase().replace(".", "");
        if (ext === "pdf") {
          files.push({
            name: entry.name,
            size: stats.size,
            type: ext,
            path: `/pdf-store/${entry.name}`,
            isDirectory: false,
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      }
    }

    // Scan public directory (for cover images)
    if (fs.existsSync(publicDir)) {
      const entries = fs.readdirSync(publicDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.name.startsWith(".")) continue;
        const filePath = path.join(publicDir, entry.name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(entry.name).toLowerCase().replace(".", "");
        if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
          files.push({
            name: entry.name,
            size: stats.size,
            type: ext,
            path: `/${entry.name}`,
            isDirectory: false,
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      }
    }

    files.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error reading project directories:", error);
    return NextResponse.json(
      { error: "Failed to read project directories" },
      { status: 500 }
    );
  }
}
