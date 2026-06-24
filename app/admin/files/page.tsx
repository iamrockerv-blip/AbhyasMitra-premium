"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import AdminSidebar from "@/components/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Plus,
  Loader2,
  X,
  Check,
  RefreshCw,
  File,
  HardDrive,
  ChevronDown,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { BRANCHES, SEMESTERS, ENGINEERING_SUBJECTS } from "@/lib/types";

interface PublicFile {
  name: string;
  size: number;
  type: string;
  path: string;
  isDirectory: boolean;
  modifiedAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  switch (type) {
    case "pdf":
      return <FileText className="w-5 h-5 text-red-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
      return <ImageIcon className="w-5 h-5 text-blue-400" />;
    default:
      return <File className="w-5 h-5 text-gray-400" />;
  }
}

function getFileTypeBadge(type: string) {
  const colors: Record<string, string> = {
    pdf: "bg-red-500/15 text-red-400 border-red-500/25",
    png: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    jpg: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    jpeg: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    mjs: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  };
  return colors[type] || "bg-gray-500/15 text-gray-400 border-gray-500/25";
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);

  // Add-as-product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown for file selection
  const [showDropdown, setShowDropdown] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    branch: "",
    semester: "3",
    description: "",
    price: "",
    pageCount: "",
    coverUrl: "",
    published: true,
  });

  // Fetch files from public folder
  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/admin/public-files");
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      toast.error("Failed to load public files");
      console.error(err);
    }
  };

  // Fetch existing products to show which files are already added
  const fetchProducts = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("createdAt", "desc"))
      );
      setExistingProducts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]
      );
    } catch {
      setExistingProducts([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchFiles(), fetchProducts()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFiles(), fetchProducts()]);
    setRefreshing(false);
    toast.success("Files refreshed");
  };

  const isFileAlreadyProduct = (file: PublicFile) => {
    return existingProducts.some(
      (p) => p.storagePath === file.name || p.coverUrl === file.path
    );
  };

  const handleSelectFile = (file: PublicFile) => {
    setSelectedFile(file);
    setShowDropdown(false);

    // Pre-fill form with file name
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    setFormData((prev) => ({
      ...prev,
      title: nameWithoutExt,
    }));
    setShowAddModal(true);
  };

  const handleOpenAddFromFile = (file: PublicFile) => {
    handleSelectFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setSubmitting(true);
    try {
      // Find a cover image — check for matching image file, or use empty
      let coverUrl = formData.coverUrl;
      if (!coverUrl) {
        // Try to find an image file with a similar name
        const nameBase = selectedFile.name.replace(/\.[^.]+$/, "").toLowerCase();
        const imageFile = files.find(
          (f) =>
            ["png", "jpg", "jpeg", "webp"].includes(f.type) &&
            f.name.toLowerCase().includes(nameBase.substring(0, 5))
        );
        if (imageFile) {
          coverUrl = imageFile.path;
        }
      }

      const productData = {
        title: formData.title,
        subject: formData.subject,
        branch: formData.branch,
        semester: parseInt(formData.semester),
        description: formData.description,
        price: parseInt(formData.price),
        pageCount: formData.pageCount ? parseInt(formData.pageCount) : null,
        coverUrl: coverUrl,
        storagePath: selectedFile.name, // File name in public folder
        published: formData.published,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "products"), productData);

      toast.success(`"${formData.title}" added as a product!`);
      setShowAddModal(false);
      resetForm();
      await fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    } finally {
      setSubmitting(false);
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
      coverUrl: "",
      published: true,
    });
    setSelectedFile(null);
  };

  const pdfFiles = files.filter((f) => f.type === "pdf");
  const imageFiles = files.filter((f) =>
    ["png", "jpg", "jpeg", "webp", "gif"].includes(f.type)
  );
  const otherFiles = files.filter(
    (f) =>
      f.type !== "pdf" &&
      !["png", "jpg", "jpeg", "webp", "gif"].includes(f.type)
  );

  return (
    <div className="flex min-h-screen bg-dark-950">
      <AdminSidebar />

      <main className="flex-1 p-4 pt-14 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                File Manager
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Manage files from the public folder &amp; add them as products
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary flex items-center gap-2 flex-1 sm:flex-initial justify-center"
                id="refresh-files-btn"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {/* Dropdown to add file as product */}
              <div className="relative flex-1 sm:flex-initial">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="btn-primary flex items-center gap-2 w-full justify-center"
                  id="add-from-public-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add as Product</span>
                  <span className="sm:hidden">Add</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* File dropdown */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto glass border border-white/10 rounded-2xl shadow-card z-50"
                    >
                      <div className="p-3 border-b border-white/5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                          Select a PDF file to add as product
                        </p>
                      </div>
                      <div className="p-1.5">
                        {pdfFiles.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            No PDF files found in public folder
                          </div>
                        ) : (
                          pdfFiles.map((file) => {
                            const alreadyAdded = isFileAlreadyProduct(file);
                            return (
                              <button
                                key={file.name}
                                onClick={() => !alreadyAdded && handleSelectFile(file)}
                                disabled={alreadyAdded}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                  alreadyAdded
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-white/5"
                                }`}
                              >
                                <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                                {alreadyAdded && (
                                  <span className="badge badge-success text-[10px]">
                                    Added
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Close dropdown on outside click */}
          {showDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center glass border border-white/8 rounded-2xl">
              <FolderOpen className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                No files found
              </h3>
              <p className="text-gray-600 mb-2 max-w-sm text-sm">
                Add files to the <code className="text-primary-400">public/</code> folder in your GitHub repository, then refresh.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: "Total Files",
                    value: files.length,
                    icon: HardDrive,
                    color: "text-primary-400",
                    bg: "bg-primary-500/10 border-primary-500/20",
                  },
                  {
                    label: "PDF Files",
                    value: pdfFiles.length,
                    icon: FileText,
                    color: "text-red-400",
                    bg: "bg-red-500/10 border-red-500/20",
                  },
                  {
                    label: "Images",
                    value: imageFiles.length,
                    icon: ImageIcon,
                    color: "text-blue-400",
                    bg: "bg-blue-500/10 border-blue-500/20",
                  },
                  {
                    label: "As Products",
                    value: existingProducts.length,
                    icon: Check,
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10 border-emerald-500/20",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass border border-white/8 rounded-xl sm:rounded-2xl p-3 sm:p-4"
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${stat.bg} border flex items-center justify-center mb-2 sm:mb-3`}
                      >
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* All Files list */}
              <div className="glass border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    All Public Files
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Files in your project&apos;s <code className="text-primary-400/80">public/</code> folder
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {files.map((file, i) => {
                    const alreadyProduct = isFileAlreadyProduct(file);
                    const isPdf = file.type === "pdf";
                    return (
                      <motion.div
                        key={file.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="text-gray-700">·</span>
                            <span className="text-xs text-gray-500">
                              {new Date(file.modifiedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Type badge */}
                        <span
                          className={`badge ${getFileTypeBadge(
                            file.type
                          )} text-[10px] flex-shrink-0`}
                        >
                          .{file.type}
                        </span>

                        {/* Status / Action */}
                        {alreadyProduct ? (
                          <span className="badge badge-success flex-shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            Added
                          </span>
                        ) : isPdf ? (
                          <button
                            onClick={() => handleOpenAddFromFile(file)}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0"
                            id={`add-file-${file.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add as Product</span>
                            <span className="sm:hidden">Add</span>
                          </button>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Add as Product Modal */}
          <AnimatePresence>
            {showAddModal && selectedFile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 sm:py-8 px-3 sm:px-4"
                onClick={(e) =>
                  e.target === e.currentTarget && setShowAddModal(false)
                }
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="glass border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-2xl shadow-card"
                >
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        Add as Product
                      </h2>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-red-400" />
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                        Title *
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Data Structures — Complete Notes"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                        id="file-product-title"
                      />
                    </div>

                    {/* Subject + Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                          Subject *
                        </label>
                        <select
                          className="input"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value })
                          }
                          required
                          id="file-product-subject"
                        >
                          <option value="">Select subject</option>
                          {ENGINEERING_SUBJECTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                          Branch *
                        </label>
                        <select
                          className="input"
                          value={formData.branch}
                          onChange={(e) =>
                            setFormData({ ...formData, branch: e.target.value })
                          }
                          required
                          id="file-product-branch"
                        >
                          <option value="">Select branch</option>
                          {BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Semester + Price + Page Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                          Semester *
                        </label>
                        <select
                          className="input"
                          value={formData.semester}
                          onChange={(e) =>
                            setFormData({ ...formData, semester: e.target.value })
                          }
                          id="file-product-semester"
                        >
                          {SEMESTERS.map((s) => (
                            <option key={s} value={s}>
                              Sem {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          placeholder="99"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          required
                          id="file-product-price"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                          Pages
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          placeholder="120"
                          value={formData.pageCount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pageCount: e.target.value,
                            })
                          }
                          id="file-product-pages"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                        Description *
                      </label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        placeholder="What's covered in these notes..."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        required
                        id="file-product-description"
                      />
                    </div>

                    {/* Cover Image URL — select from public images */}
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                        Cover Image
                      </label>
                      {imageFiles.length > 0 ? (
                        <select
                          className="input"
                          value={formData.coverUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              coverUrl: e.target.value,
                            })
                          }
                          id="file-product-cover"
                        >
                          <option value="">No cover image</option>
                          {imageFiles.map((img) => (
                            <option key={img.name} value={img.path}>
                              {img.name} ({formatFileSize(img.size)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-gray-500">
                          No images found in public folder. Add images via GitHub.
                        </p>
                      )}
                    </div>

                    {/* Published toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            published: !formData.published,
                          })
                        }
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          formData.published ? "bg-primary-500" : "bg-dark-600"
                        }`}
                        id="file-product-published-toggle"
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            formData.published
                              ? "translate-x-5"
                              : "translate-x-0.5"
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
                      className="btn-primary w-full py-3 sm:py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
                      id="file-product-submit"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add to Website
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
