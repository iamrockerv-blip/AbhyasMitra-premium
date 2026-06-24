"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import type { Product } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NoteCard from "@/components/NoteCard";
import SkeletonCard from "@/components/SkeletonCard";
import { BookOpen, Search, SlidersHorizontal } from "lucide-react";

const DM_PRODUCT_MOCK: Product = {
  id: "mock-1",
  title: "Discrete Mathematics (DM) — Complete Question Bank with Solutions",
  subject: "Discrete Mathematics",
  branch: "Computer Engineering / IT",
  semester: 3,
  description: "The ultimate Discrete Mathematics (DM) exam companion. Complete question bank covering Set Theory, Relations, Functions, Graph Theory, Trees, Algebraic Systems, and Groups. Includes step-by-step solved proofs, past SPPU exam questions, and shortcuts for scoring high marks.",
  coverUrl: "/dmposter.png",
  storagePath: "DM Complete QB without pass.pdf",
  price: 99,
  pageCount: 22,
  published: true,
  createdAt: new Date().toISOString(),
};

export default function LandingClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return unsub;
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, "products"),
          where("published", "==", true),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        // Use the uploaded DM notes first, fall back to mock structure
        if (fetched.length > 0) {
          setProducts(fetched);
        } else {
          setProducts([DM_PRODUCT_MOCK]);
        }
      } catch {
        setProducts([DM_PRODUCT_MOCK]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBranch = selectedBranch === "" || p.branch === selectedBranch;
    const matchSem = selectedSemester === "" || p.semester === selectedSemester;
    return matchSearch && matchBranch && matchSem;
  });

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      {/* ============================================================
          NOTES GRID
          ============================================================ */}
      <section
        id="notes"
        className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Premium Content
          </h2>
          <p className="text-gray-400">
            Very Important Questions and Notes
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              id="notes-search"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              showFilters
                ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
            }`}
            id="toggle-filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass border border-white/8 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input"
                id="filter-branch"
              >
                <option value="">All Branches</option>
                <option value="Computer Engineering / IT">Computer Engineering / IT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) =>
                  setSelectedSemester(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="input"
                id="filter-semester"
              >
                <option value="">All Semesters</option>
                <option value="3">Semester 3</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Notes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 1 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No notes found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filtered.map((product, i) => (
              <NoteCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
