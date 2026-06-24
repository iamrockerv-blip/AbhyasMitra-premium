"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import AdminSidebar from "@/components/AdminSidebar";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  ShoppingBag,
  IndianRupee,
  Users,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Purchase, Product } from "@/lib/types";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  recentPurchases: Purchase[];
}

const EMPTY_STATS: Stats = {
  totalRevenue: 0,
  totalOrders: 0,
  totalProducts: 0,
  recentPurchases: [],
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch products count
        const productsSnap = await getDocs(collection(db, "products"));
        const totalProducts = productsSnap.size;

        // Fetch purchases
        const purchasesSnap = await getDocs(
          query(collection(db, "purchases"), orderBy("purchasedAt", "desc"), limit(50))
        );
        const allPurchases = purchasesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Purchase[];

        const completedPurchases = allPurchases.filter((p) => p.status === "completed");
        const totalRevenue = completedPurchases.reduce((sum, p) => sum + p.amount, 0);
        const totalOrders = completedPurchases.length;

        // Group by date for chart
        const byDate: Record<string, number> = {};
        completedPurchases.forEach((p) => {
          const date = new Date(p.purchasedAt).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          });
          byDate[date] = (byDate[date] || 0) + p.amount;
        });

        const chartPoints = Object.entries(byDate)
          .slice(-7)
          .map(([date, revenue]) => ({ date, revenue }));

        setStats({
          totalRevenue,
          totalOrders,
          totalProducts,
          recentPurchases: allPurchases.slice(0, 5),
        });
        setChartData(chartPoints);
      } catch {
        // Firebase not configured — show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Products",
      value: stats.totalProducts,
      icon: BookOpen,
      color: "text-primary-400",
      bg: "bg-primary-500/10 border-primary-500/20",
    },
    {
      label: "Avg. Order Value",
      value: stats.totalOrders
        ? `₹${Math.round(stats.totalRevenue / stats.totalOrders)}`
        : "₹0",
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="flex min-h-screen bg-dark-950">
      <AdminSidebar />

      <main className="flex-1 p-4 pt-14 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-gray-400">Overview of AbhyasMitra Premium</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="glass border border-white/8 rounded-2xl p-5"
                    >
                      <div className={`w-10 h-10 rounded-xl ${card.bg} border flex items-center justify-center mb-4`}>
                        <Icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {card.value}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">
                        {card.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Revenue Chart */}
              {chartData.length > 0 && (
                <div className="glass border border-white/8 rounded-2xl p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-6">Revenue (Last 7 Days)</h2>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#18181f",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "0.75rem",
                            color: "#f0f0f5",
                          }}
                          formatter={(v) => [`₹${v}`, "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ fill: "#6366f1", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent Purchases */}
              <div className="glass border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
                  <a
                    href="/admin/orders"
                    className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                  >
                    View all <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
                {stats.recentPurchases.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500 text-sm">
                    No orders yet
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {stats.recentPurchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="px-6 py-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {purchase.userEmail || purchase.userId}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {purchase.productId} · {new Date(purchase.purchasedAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">
                            ₹{purchase.amount}
                          </span>
                          <span className="badge badge-success">completed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
