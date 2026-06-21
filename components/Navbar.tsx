"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Library,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

export default function Navbar() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
    setUserMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/#notes", label: "Browse Notes" },
  ];

  const isAdmin = pathname.startsWith("/admin");

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-white/5 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-sm tracking-tight">
                AbhyasMitra
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-primary-400 uppercase">
                Premium
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          {!isAdmin && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? "text-primary-400 bg-primary-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Library link */}
                {!isAdmin && (
                  <Link
                    href="/library"
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Library className="w-4 h-4" />
                    My Library
                  </Link>
                )}

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 hover:border-primary-500/40 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm text-gray-300 max-w-[120px] truncate">
                      {user.displayName || user.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 glass border border-white/10 rounded-2xl overflow-hidden shadow-card"
                      >
                        <div className="p-3 border-b border-white/5">
                          <p className="text-xs text-gray-500">Signed in as</p>
                          <p className="text-sm text-white font-medium truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="p-1">
                          <Link
                            href="/library"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <Library className="w-4 h-4" />
                            My Library
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-2 btn-primary text-sm py-2 px-4"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg glass border border-white/10 text-gray-400 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-3 overflow-hidden"
            >
              <div className="glass border border-white/10 rounded-2xl p-2 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    href="/library"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Library className="w-4 h-4" />
                    My Library
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
