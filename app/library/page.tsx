"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import type { Product, Purchase } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NoteCard from "@/components/NoteCard";
import SkeletonCard from "@/components/SkeletonCard";
import { motion } from "framer-motion";
import { Library, BookOpen, ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface LibraryItem {
  purchase: Purchase;
  product: Product | null;
}

const DM_PRODUCT_MOCK: Product = {
  id: "mock-1",
  title: "Discrete Mathematics (DM) — Complete Question Bank with Solutions",
  subject: "Discrete Mathematics",
  branch: "Computer Engineering / IT",
  semester: 3,
  description:
    "The ultimate Discrete Mathematics (DM) exam companion. Complete question bank covering Set Theory, Relations, Functions, Graph Theory, Trees, Algebraic Systems, and Groups. Includes step-by-step solved proofs, past SPPU exam questions, and shortcuts for scoring high marks.",
  coverUrl: "/dmposter.png",
  storagePath: "DM Complete QB without pass.pdf",
  price: 99,
  pageCount: 22,
  published: true,
  createdAt: new Date().toISOString(),
};

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth");
        return;
      }
      try {
        const q = query(
          collection(db, "purchases"),
          where("userId", "==", user.uid),
          where("status", "==", "completed")
        );
        const snapshot = await getDocs(q);
        const purchases = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Purchase[];

        // Fetch associated products
        const libItems: LibraryItem[] = await Promise.all(
          purchases.map(async (purchase) => {
            try {
              if (purchase.productId === "mock-1") {
                return { purchase, product: DM_PRODUCT_MOCK };
              }
              const productDoc = await getDoc(doc(db, "products", purchase.productId));
              const product = productDoc.exists()
                ? ({ id: productDoc.id, ...productDoc.data() } as Product)
                : null;
              return { purchase, product };
            } catch {
              return { purchase, product: purchase.productId === "mock-1" ? DM_PRODUCT_MOCK : null };
            }
          })
        );

        setItems(libItems);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">My Library</h1>
          </div>
          <p className="text-gray-400">
            All your purchased notes — access them anytime, secured in-browser.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-dark-800 border border-white/8 flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-300 mb-3">
              Your library is empty
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm">
              You have not purchased any notes yet. Browse our collection and get started!
            </p>
            <Link href="/#notes" className="btn-primary flex items-center gap-2 px-6 py-3">
              <BookOpen className="w-4 h-4" />
              Browse Notes
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(({ purchase, product }, i) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-dark-800 hover:border-primary-500/30 transition-all duration-300"
              >
                {product ? (
                  <>
                    {/* Same card layout as NoteCard but with "Read Now" button */}
                    <div className="p-5 flex-1">
                      <span className="badge badge-success mb-3">Purchased</span>
                      <h3 className="font-semibold text-white text-base leading-snug mb-2">
                        {product.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="badge badge-primary">{product.subject}</span>
                        <span>Sem {product.semester}</span>
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <Link
                        href={`/view/${purchase.id}`}
                        className="w-full flex items-center justify-center gap-2 btn-primary py-3"
                        id={`read-note-${purchase.id}`}
                      >
                        <BookOpen className="w-4 h-4" />
                        Read Now
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="p-5">
                    <p className="text-gray-500 text-sm">Product unavailable</p>
                    <p className="text-xs text-gray-600 mt-1">Purchase ID: {purchase.id}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
