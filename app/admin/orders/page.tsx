"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import AdminSidebar from "@/components/AdminSidebar";
import { Loader2, Search, IndianRupee, ShoppingBag } from "lucide-react";
import type { Purchase } from "@/lib/types";

export default function AdminOrdersPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDocs(
          query(collection(db, "purchases"), orderBy("purchasedAt", "desc"))
        );
        setPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Purchase[]);
      } catch {
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = purchases.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.userEmail?.toLowerCase().includes(q) ||
      p.productId?.toLowerCase().includes(q) ||
      p.paymentId?.toLowerCase().includes(q) ||
      p.orderId?.toLowerCase().includes(q)
    );
  });

  const totalRevenue = purchases
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex min-h-screen bg-dark-950">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Orders</h1>
              <p className="text-gray-400 mt-1">
                {purchases.length} orders · Total revenue: ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email, product ID, payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
              id="orders-search"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 glass border border-white/8 rounded-2xl">
              <ShoppingBag className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-500">
                {search ? "No orders match your search" : "No orders yet"}
              </p>
            </div>
          ) : (
            <div className="glass border border-white/8 rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                <div className="col-span-3">Buyer</div>
                <div className="col-span-2">Product</div>
                <div className="col-span-2">Payment ID</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-2">Status</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {filtered.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/2 transition-colors items-center"
                  >
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-white truncate">
                        {purchase.userEmail || purchase.userId}
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm text-gray-400 truncate font-mono text-xs">
                        {purchase.productId}
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-gray-500 font-mono truncate">
                        {purchase.paymentId || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400">
                        {purchase.purchasedAt
                          ? new Date(purchase.purchasedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-0.5 text-sm font-semibold text-white">
                        <IndianRupee className="w-3 h-3 text-primary-400" />
                        {purchase.amount}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`badge ${
                          purchase.status === "completed"
                            ? "badge-success"
                            : purchase.status === "pending"
                            ? "badge-warning"
                            : "badge-primary"
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
