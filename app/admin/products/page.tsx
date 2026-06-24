"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import AdminSidebar from "@/components/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  IndianRupee,
} from "lucide-react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { BRANCHES, SEMESTERS, ENGINEERING_SUBJECTS } from "@/lib/types";

interface UploadProgress {
  status: "idle" | "uploading" | "done" | "error";
  percent: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    branch: "",
    semester: "3",
    description: "",
    price: "",
    pageCount: "",
    published: true,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("createdAt", "desc"))
      );
      setProducts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]
      );
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error("Please select a PDF file");
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();

      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("subject", formData.subject);
      fd.append("branch", formData.branch);
      fd.append("semester", formData.semester);
      fd.append("description", formData.description);
      fd.append("price", formData.price);
      fd.append("pageCount", formData.pageCount);
      fd.append("published", String(formData.published));
      fd.append("pdf", pdfFile);
      if (coverFile) fd.append("cover", coverFile);

      const res = await fetch("/api/admin/upload-product", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Note uploaded successfully!");
      setShowForm(false);
      resetForm();
      await fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();

      const res = await fetch(
        `/api/admin/upload-product?productId=${productId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (res.ok) {
        toast.success("Product deleted");
        setProducts((p) => p.filter((x) => x.id !== productId));
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleTogglePublished = async (product: Product) => {
    try {
      await updateDoc(doc(db, "products", product.id), {
        published: !product.published,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, published: !p.published } : p
        )
      );
      toast.success(
        `Note ${product.published ? "unpublished" : "published"}`
      );
    } catch {
      toast.error("Update failed");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      subject: "",
      branch: "",
      semester: "3",
      description: "",
      price: "",
      pageCount: "",
      published: true,
    });
    setCoverFile(null);
    setPdfFile(null);
    setCoverPreview("");
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <AdminSidebar />

      <main className="flex-1 p-4 pt-14 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Products</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage your note catalog</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              id="add-product-btn"
            >
              <Plus className="w-4 h-4" />
              Add New Note
            </button>
          </div>

          {/* Add Note Modal */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
                onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="glass border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-card"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Add New Note</h2>
                    <button
                      onClick={() => { setShowForm(false); resetForm(); }}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
                      <input
                        className="input"
                        placeholder="e.g. Data Structures — Complete Notes"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        id="product-title"
                      />
                    </div>

                    {/* Subject + Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Subject *</label>
                        <select
                          className="input"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                          id="product-subject"
                        >
                          <option value="">Select subject</option>
                          {ENGINEERING_SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Branch *</label>
                        <select
                          className="input"
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          required
                          id="product-branch"
                        >
                          <option value="">Select branch</option>
                          {BRANCHES.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Semester + Price + Page Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Semester *</label>
                        <select
                          className="input"
                          value={formData.semester}
                          onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                          id="product-semester"
                        >
                          {SEMESTERS.map((s) => (
                            <option key={s} value={s}>Sem {s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Price (₹) *</label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          placeholder="99"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          id="product-price"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Pages</label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          placeholder="120"
                          value={formData.pageCount}
                          onChange={(e) => setFormData({ ...formData, pageCount: e.target.value })}
                          id="product-pages"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        placeholder="What's covered in these notes..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        id="product-description"
                      />
                    </div>

                    {/* Cover Image */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Cover Image</label>
                      <div className="flex items-start gap-4">
                        <label
                          htmlFor="cover-upload"
                          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer transition-colors"
                        >
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-400">
                            {coverFile ? coverFile.name : "Click to upload cover image"}
                          </span>
                          <input
                            id="cover-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                          />
                        </label>
                        {coverPreview && (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                            <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PDF Upload */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">PDF File *</label>
                      <label
                        htmlFor="pdf-upload"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer transition-colors"
                      >
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-400">
                          {pdfFile ? pdfFile.name : "Click to upload PDF"}
                        </span>
                        <input
                          id="pdf-upload"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                          required
                        />
                      </label>
                    </div>

                    {/* Published toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, published: !formData.published })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          formData.published ? "bg-primary-500" : "bg-dark-600"
                        }`}
                        id="product-published-toggle"
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            formData.published ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-gray-300">
                        {formData.published ? "Published" : "Draft"}
                      </span>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
                      id="product-submit"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Note
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center glass border border-white/8 rounded-2xl">
              <BookOpen className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No products yet</h3>
              <p className="text-gray-600 mb-6">Add your first note to get started</p>
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add First Note
              </button>
            </div>
          ) : (
            <div className="glass border border-white/8 rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/2 transition-colors"
                  >
                    {/* Cover */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-dark-700 flex-shrink-0">
                      {product.coverUrl ? (
                        <Image
                          src={product.coverUrl}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <p className="text-sm font-medium text-white truncate">{product.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{product.subject}</span>
                        <span className="text-gray-700 hidden sm:inline">·</span>
                        <span className="text-xs text-gray-500">Sem {product.semester}</span>
                        <span className="text-gray-700 hidden sm:inline">·</span>
                        <span className="text-xs text-gray-500 hidden sm:inline">{product.branch}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-1 text-white font-semibold text-sm">
                      <IndianRupee className="w-3.5 h-3.5 text-primary-400" />
                      {product.price}
                    </div>

                    {/* Status badge */}
                    <span className={`badge ${product.published ? "badge-success" : "badge-warning"}`}>
                      {product.published ? "Published" : "Draft"}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePublished(product)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                        title={product.published ? "Unpublish" : "Publish"}
                      >
                        {product.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.title)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
