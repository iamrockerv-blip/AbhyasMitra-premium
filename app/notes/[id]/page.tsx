"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import type { Product } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  BookOpen,
  IndianRupee,
  FileText,
  Shield,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Star,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { email?: string; name?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
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

const FEATURES = [
  { icon: FileText, text: "Expertly curated exam-focused content" },
  { icon: Shield, text: "Secure in-browser access — no download" },
  { icon: Lock, text: "Watermarked with your identity for security" },
  { icon: Star, text: "Based on latest SPPU syllabus" },
];

export default function NoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  useEffect(() => {
    async function fetch() {
      try {
        const docRef = doc(db, "products", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() } as Product);
        } else {
          setProduct(DM_PRODUCT_MOCK);
        }
      } catch {
        setProduct(DM_PRODUCT_MOCK);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  // Check if user already purchased this product
  useEffect(() => {
    async function checkPurchase() {
      if (!user || !product) return;
      try {
        const q = query(
          collection(db, "purchases"),
          where("userId", "==", user.uid),
          where("productId", "==", product.id),
          where("status", "==", "completed")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAlreadyPurchased(true);
          setPurchaseId(snap.docs[0].id);
        }
      } catch { /* ignore */ }
    }
    checkPurchase();
  }, [user, product]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please sign in to purchase notes");
      router.push("/auth");
      return;
    }

    if (!product) return;

    setPaying(true);
    try {
      // 1. Create Razorpay order via API
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await orderRes.json();

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Razorpay SDK failed to load");
      }

      // 3. Get user's ID token for payment verification
      const idToken = await user.getIdToken();

      // 4. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AbhyasMitra Premium",
        description: product.title,
        order_id: orderData.id,
        prefill: {
          email: user.email || "",
          name: user.displayName || "",
        },
        theme: { color: "#6366f1" },
        handler: async (response: RazorpayResponse) => {
          // 5. Verify payment server-side
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                productId: product.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              toast.success("Payment successful! Redirecting to viewer...");
              // Query purchases collection to get the freshly created purchaseId
              setTimeout(async () => {
                try {
                  const q = query(
                    collection(db, "purchases"),
                    where("userId", "==", user.uid),
                    where("productId", "==", product.id),
                    where("status", "==", "completed")
                  );
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    router.push(`/view/${snap.docs[0].id}`);
                  } else {
                    router.push("/library");
                  }
                } catch {
                  router.push("/library");
                }
              }, 1500);
            } else {
              toast.error("Payment verification failed. Contact support.");
            }
          } catch {
            toast.error("Verification error. Your payment may still be processing.");
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info("Payment cancelled");
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Payment initiation failed. Please try again.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Note not found</h1>
          <Link href="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Notes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left — Details */}
          <div className="lg:col-span-3 space-y-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="badge badge-primary">{product.subject}</span>
                <span className="text-xs text-gray-500">{product.branch}</span>
                <span className="text-xs text-gray-500">Semester {product.semester}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
                {product.title}
              </h1>
              <p className="text-gray-400 text-base leading-relaxed">
                {product.description}
              </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { label: "Pages", value: `${product.pageCount || "—"}` },
                { label: "Semester", value: `Sem ${product.semester}` },
                { label: "Format", value: "PDF" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass border border-white/8 rounded-2xl p-4 text-center"
                >
                  <div className="text-lg sm:text-xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                What&apos;s included
              </h3>
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-400" />
                  </div>
                  <span className="text-sm text-gray-300">{text}</span>
                </div>
              ))}
            </div>

            {/* Content Protection Notice */}
            <div className="glass border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
              <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300 mb-1">
                  Content Protected
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  After purchase, notes are viewable in-browser only — no download,
                  print, or copy. Each session is watermarked with your account email
                  as a security and traceability measure.
                </p>
              </div>
            </div>
          </div>

          {/* Right — Purchase Card */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="sticky top-28 glass border border-white/10 rounded-3xl p-8 shadow-card"
            >
              {/* Cover Preview */}
              <div className="relative h-40 sm:h-56 rounded-2xl overflow-hidden bg-dark-700 mb-6">
                {product.coverUrl ? (
                  <Image
                    src={product.coverUrl}
                    alt={product.title}
                    fill
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900/40 to-dark-700">
                    <BookOpen className="w-16 h-16 text-primary-500/40 mb-2" />
                    <span className="text-xs text-gray-600">Preview unavailable</span>
                  </div>
                )}
                {/* Blur overlay — preview only */}
                <div className="absolute inset-0 backdrop-blur-sm bg-dark-900/50 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Preview locked</p>
                    <p className="text-xs text-gray-500">Purchase to access full content</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-4 sm:mb-6">
                <IndianRupee className="w-6 h-6 text-primary-400 self-start mt-1" />
                <span className="text-4xl sm:text-5xl font-black text-white">{product.price}</span>
                <span className="text-gray-500 ml-1">one-time</span>
              </div>

              {/* Action */}
              {alreadyPurchased ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircle className="w-5 h-5" />
                    You own this note
                  </div>
                  <Link
                    href={`/view/${purchaseId}`}
                    className="w-full flex items-center justify-center gap-2 btn-primary py-3.5"
                    id="read-now-btn"
                  >
                    <BookOpen className="w-4 h-4" />
                    Read Now
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleBuyNow}
                  disabled={paying}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  id="buy-now-btn"
                >
                  {paying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <IndianRupee className="w-5 h-5" />
                      Buy Now — ₹{product.price}
                    </>
                  )}
                </button>
              )}

              {/* Security badges */}
              <div className="mt-6 pt-6 border-t border-white/5 space-y-2.5">
                {[
                  { icon: Shield, text: "Secured by Razorpay" },
                  { icon: Lock, text: "Protected PDF viewer" },
                  { icon: CheckCircle, text: "Instant access after payment" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-gray-500">
                    <Icon className="w-3.5 h-3.5 text-primary-500" />
                    {text}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
