"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";
import { BookOpen, Mail, Lock, Loader2, ShieldAlert } from "lucide-react";

// Inner component uses useSearchParams — must be wrapped in Suspense
function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;

      // Strict client-side check for admin email
      if (user.email?.toLowerCase() !== "vinaybhadane06@gmail.com") {
        await auth.signOut();
        toast.error("Access denied. Only vinaybhadane06@gmail.com is authorized via Google.");
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/admin/check-admin", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();

      if (!data.isAdmin) {
        await auth.signOut();
        toast.error("Access denied. This account does not have admin privileges.");
        setLoading(false);
        return;
      }

      // Set session cookie for proxy/middleware route guard
      document.cookie = `admin_session=${idToken}; path=/; max-age=3600; SameSite=Strict`;

      toast.success("Welcome to the Admin Panel!");
      router.push(redirect);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailLower = email.toLowerCase().trim();
    if (emailLower !== "testlogin@gmail.com") {
      toast.error("Email/Password login is restricted to the test account.");
      setLoading(false);
      return;
    }

    if (password !== "abhyasmitratestlogin") {
      toast.error("Incorrect password for the test account.");
      setLoading(false);
      return;
    }

    try {
      let credential;
      try {
        // Attempt login
        credential = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (err: any) {
        // Auto-create test account on the fly if it doesn't exist yet
        if (
          err.code === "auth/user-not-found" ||
          err.code === "auth/invalid-credential" ||
          err.message?.includes("invalid-credential") ||
          err.message?.includes("user-not-found")
        ) {
          console.log("Test login not found, auto-creating in Firebase Auth...");
          credential = await createUserWithEmailAndPassword(auth, emailLower, password);
        } else {
          throw err;
        }
      }

      const user = credential.user;
      const idToken = await user.getIdToken();

      const res = await fetch("/api/admin/check-admin", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();

      if (!data.isAdmin) {
        await auth.signOut();
        toast.error("Access denied. This account does not have admin privileges.");
        setLoading(false);
        return;
      }

      // Set session cookie for proxy/middleware route guard
      document.cookie = `admin_session=${idToken}; path=/; max-age=3600; SameSite=Strict`;

      toast.success("Test Admin Session Started!");
      router.push(redirect);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Login failed. Please verify credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Google Login for Admin */}
      <div>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer"
          id="google-admin-login"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">or use test login</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Test login Email/Password Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
            Test Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="testlogin@gmail.com"
              required
              className="input pl-10"
              id="admin-email"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
            Test Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input pl-10"
              id="admin-password"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
          id="admin-login-submit"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Sign In as Test Admin"
          )}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-dark-950 hero-mesh flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-primary-600/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">AbhyasMitra Premium</p>
        </div>

        {/* Security warning */}
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <ShieldAlert className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300/80">
            Restricted access. Authorized login attempts are logged.
          </p>
        </div>

        {/* Card */}
        <div className="glass border border-white/10 rounded-3xl p-8 shadow-card">
          {/* Suspense required for useSearchParams() in App Router */}
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          }>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
