import { NextResponse } from "next/server";
import { getApps, App, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: any = {
    env: {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "missing",
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "missing",
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.length : 0,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "missing",
    }
  };

  try {
    const existingApps = getApps();
    diagnostics.existingAppsCount = existingApps.length;

    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (privateKey) {
      diagnostics.rawPrivateKeyStart = privateKey.substring(0, 40);
      diagnostics.rawPrivateKeyEnd = privateKey.substring(privateKey.length - 40);
      
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.trim();
      privateKey = privateKey.replace(/\\n/g, "\n");
      
      diagnostics.processedPrivateKeyStart = privateKey.substring(0, 40);
      diagnostics.processedPrivateKeyEnd = privateKey.substring(privateKey.length - 40);
      diagnostics.hasNewlines = privateKey.includes("\n");
      diagnostics.hasEscapedNewlines = privateKey.includes("\\n");
    }

    if (existingApps.length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "",
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "",
          privateKey: privateKey || "",
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      diagnostics.action = "initialized new app";
    } else {
      diagnostics.action = "reused existing app";
    }

    const auth = getAuth();
    diagnostics.success = true;
    diagnostics.authName = auth.app.name;

    return NextResponse.json(diagnostics);
  } catch (err: any) {
    diagnostics.success = false;
    diagnostics.error = {
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
