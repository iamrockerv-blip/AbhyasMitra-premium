"use client";

import Link from "next/link";
import { BookOpen, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-950 hero-mesh flex flex-col items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-primary-600/10 blur-3xl" />

      <div className="relative text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </Link>
        </div>

        {/* 404 */}
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => history.back()}
            className="btn-secondary flex items-center justify-center gap-2 px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
