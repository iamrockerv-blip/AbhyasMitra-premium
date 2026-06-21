"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ViewPage() {
  const params = useParams();
  const purchaseId = params.purchaseId as string;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/auth");
      } else {
        setUser(u);
      }
      setChecking(false);
    });
    return unsub;
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <Lock className="w-12 h-12 text-gray-600" />
        <h2 className="text-xl font-semibold text-white">Sign in required</h2>
        <Link href="/auth" className="btn-primary px-6 py-2.5">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <SecurePdfViewer
      purchaseId={purchaseId}
      userEmail={user.email || user.uid}
    />
  );
}
