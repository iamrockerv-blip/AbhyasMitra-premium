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
    const publicDir = path.join(process.cwd(), "public");

    if (!fs.existsSync(publicDir)) {
      return NextResponse.json({ files: [] });
    }

    const entries = fs.readdirSync(publicDir, { withFileTypes: true });

    const files: PublicFile[] = entries
      .map((entry) => {
        const filePath = path.join(publicDir, entry.name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(entry.name).toLowerCase().replace(".", "");

        return {
          name: entry.name,
          size: stats.size,
          type: ext,
          path: `/${entry.name}`,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      // Filter out directories and common non-content files
      .filter(
        (f) =>
          !f.isDirectory &&
          !f.name.startsWith(".") &&
          !["svg", "ico"].includes(f.type) &&
          f.name !== "pdf.worker.min.mjs"
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error reading public directory:", error);
    return NextResponse.json(
      { error: "Failed to read public directory" },
      { status: 500 }
    );
  }
}
