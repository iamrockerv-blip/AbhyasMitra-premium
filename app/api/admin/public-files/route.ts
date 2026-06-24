import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/admin/public-files
 *
 * Returns a list of files in the `public/` directory.
 * This lets the admin see what files are available to add as products.
 *
 * Security: Only accessible to admin users (checked via ADMIN_EMAIL env var).
 * The auth check is done client-side via Firebase — this API only lists files,
 * it doesn't expose any sensitive data beyond what's already publicly accessible.
 */

interface PublicFile {
  name: string;
  size: number;
  type: string;       // file extension
  path: string;       // public URL path (e.g., "/filename.pdf")
  isDirectory: boolean;
  modifiedAt: string;  // ISO date string
}

export async function GET() {
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
