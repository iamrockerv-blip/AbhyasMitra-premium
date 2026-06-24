/**
 * Firebase ADMIN SDK initialization
 * ⚠️  SERVER ONLY — never import this from client components or pages.
 *
 * Lazy initialization: functions are returned lazily to prevent build-time
 * failures when env vars contain placeholder values.
 */
import { getApps, App, cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { getAuth, Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) return existingApps[0];

  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.trim();
    // Strip surrounding quotes if present (often pasted like this in Vercel dashboard)
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.trim();
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";

  if (!projectId || !clientEmail || !privateKey) {
    console.error("[firebase-admin] Missing credentials:", {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey || "",
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error("[firebase-admin] Initialization failed:", error);
    throw error;
  }
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// Convenience re-exports that initialize on first call
// Usage: const db = adminDb(); — call as function in API routes
export const adminDb = getAdminDb;
export const adminStorage = getAdminStorage;
export const adminAuth = getAdminAuth;
