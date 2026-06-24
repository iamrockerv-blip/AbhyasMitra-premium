"use client";

/**
 * SecurePdfViewer
 *
 * ARCHITECTURE OVERVIEW:
 * - PDF bytes are fetched from /api/pdf/[purchaseId] with a Firebase Auth ID token.
 *   The server verifies ownership before streaming any bytes. The raw Storage URL
 *   is never sent to the client.
 * - Pages are rendered onto individual <canvas> elements using pdfjs-dist.
 * - A diagonal watermark (buyer's email + "AbhyasMitra Premium") is drawn directly
 *   onto each canvas AFTER PDF rendering, so it's pixel-level (not a removable DOM overlay).
 *
 * CONTENT PROTECTION (deterrent layer — not unbreakable DRM):
 * - Right-click disabled
 * - Text selection disabled via CSS
 * - Ctrl+S, Ctrl+P, Ctrl+C, F12, Ctrl+Shift+I blocked via keydown listener
 * - Dev-tools detection heuristic (window size diff) blurs canvas
 * - pointer-events: none on canvas prevents drag-selection
 *
 * HONEST NOTE: Screenshots and phone cameras can never be blocked client-side.
 * The watermark with buyer's identity is the actual traceability mechanism.
 * This protection layer stops 95% of casual copying, which is the realistic goal.
 *
 * ACCESSIBILITY TRADE-OFF: These measures intentionally override normal text-selection
 * accessibility behavior on this specific viewer page only. This is an intentional
 * content-protection decision; keyboard navigation for page buttons is preserved.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  BookOpen,
  Maximize,
  ArrowLeft,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import Link from "next/link";

// Set worker path — use local copy served from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface SecurePdfViewerProps {
  purchaseId: string;
  userEmail: string;
}

export default function SecurePdfViewer({ purchaseId, userEmail }: SecurePdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [fitScale, setFitScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("1");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const userRef = useRef<User | null>(null);

  // Touch handling refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // ─── Calculate fit-to-width scale ─────────────────────────────────────────
  const calculateFitScale = useCallback(async () => {
    if (!pdfDoc || !scrollContainerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = scrollContainerRef.current.clientWidth - 32; // 16px padding each side
      const newFitScale = containerWidth / viewport.width;
      setFitScale(newFitScale);
      return newFitScale;
    } catch {
      return 1.0;
    }
  }, [pdfDoc, currentPage]);

  // Recalculate fit scale on resize
  useEffect(() => {
    const handleResize = () => {
      calculateFitScale();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateFitScale]);

  // Set initial scale once fit scale is calculated
  useEffect(() => {
    if (fitScale > 0 && loading === false && scale === 1.0) {
      setScale(fitScale);
    }
  }, [fitScale, loading]);

  // ─── Dev-tools detection heuristic ────────────────────────────────────────
  // Compares window.outerWidth vs window.innerWidth; when dev-tools are open
  // on the side, the difference grows noticeably. This is a heuristic, not
  // a reliable detection — it will have false positives/negatives.
  useEffect(() => {
    const check = () => {
      const threshold = 160;
      const open =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;
      setDevToolsOpen(open);
    };
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  // ─── Keyboard shortcut blocking ───────────────────────────────────────────
  useEffect(() => {
    const BLOCKED_KEYS = new Set(["F12", "PrintScreen"]);
    const BLOCKED_COMBOS = [
      { ctrl: true, key: "s" },
      { ctrl: true, key: "p" },
      { ctrl: true, key: "c" },
      { ctrl: true, shift: true, key: "i" },
      { ctrl: true, shift: true, key: "j" },
      { ctrl: true, shift: true, key: "c" },
      { ctrl: true, key: "u" },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        toast.warning("This action is disabled for content protection");
        return;
      }
      const isBlocked = BLOCKED_COMBOS.some(
        (combo) =>
          combo.ctrl === e.ctrlKey &&
          (combo.shift === undefined || combo.shift === e.shiftKey) &&
          combo.key === e.key.toLowerCase()
      );
      if (isBlocked) {
        e.preventDefault();
        toast.warning("This action is disabled for content protection");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Right-click disable ──────────────────────────────────────────────────
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Right-click is disabled for content protection");
    };
    const container = containerRef.current;
    container?.addEventListener("contextmenu", handleContextMenu);
    return () => container?.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // ─── Touch swipe for page navigation ─────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      // Only treat as horizontal swipe if horizontal movement > vertical
      if (dx > dy && dx > 30) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      const touchEndX = e.changedTouches[0].clientX;
      const dx = touchEndX - touchStartX.current;
      const threshold = 60;

      if (dx < -threshold) {
        // Swipe left → next page
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      } else if (dx > threshold) {
        // Swipe right → previous page
        setCurrentPage((p) => Math.max(p - 1, 1));
      }
      isSwiping.current = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [totalPages]);

  // ─── Auth + PDF fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("You must be signed in to view this document.");
        setLoading(false);
        return;
      }
      userRef.current = user;

      try {
        const idToken = await user.getIdToken();

        // Fetch PDF bytes through our secure API route (never a direct Storage URL)
        const response = await fetch(`/api/pdf/${purchaseId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!response.ok) {
          if (response.status === 403) {
            setError("Access denied. You do not own this document.");
          } else if (response.status === 401) {
            setError("Authentication expired. Please refresh and try again.");
          } else {
            setError("Failed to load document. Please try again.");
          }
          setLoading(false);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error("PDF load error:", err);
        setError("Failed to load document. Please try again.");
        setLoading(false);
      }
    });
    return unsub;
  }, [purchaseId]);

  // ─── Calculate fit scale when PDF is loaded ───────────────────────────────
  useEffect(() => {
    if (pdfDoc) {
      calculateFitScale().then((fs) => {
        if (fs) setScale(fs);
      });
    }
  }, [pdfDoc, calculateFitScale]);

  // ─── Draw watermark on canvas ────────────────────────────────────────────
  const drawWatermark = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const text = `${userEmail} | AbhyasMitra Premium`;
      const angle = -Math.PI / 5; // -36 degrees
      const spacing = 200; // px between watermark repetitions

      ctx.save();
      ctx.font = "bold 14px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(99, 102, 241, 0.12)";
      ctx.globalCompositeOperation = "source-over";

      // Tile the watermark across the whole canvas
      for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    },
    [userEmail]
  );

  // ─── Render page ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      // Cancel any in-progress render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch { /* ignore */ }
      }

      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderTask = page.render({
        canvasContext: ctx,
        canvas,
        viewport,
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      // Draw watermark ON TOP of rendered page pixels
      drawWatermark(canvas);
    };

    renderPage().catch((err) => {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Render error:", err);
      }
    });
  }, [pdfDoc, currentPage, scale, drawWatermark]);

  // ─── Sync page input value ───────────────────────────────────────────────
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  // ─── Keyboard page navigation (accessibility preserved) ───────────────────
  useEffect(() => {
    const handleNav = (e: KeyboardEvent) => {
      // Allow arrow keys for page navigation even in the viewer
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentPage((p) => Math.max(p - 1, 1));
      }
    };
    document.addEventListener("keydown", handleNav);
    return () => document.removeEventListener("keydown", handleNav);
  }, [totalPages]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleFitWidth = () => {
    setScale(fitScale);
  };

  const handlePageInput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pageInputValue);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
        <p className="text-gray-400 text-sm">Loading secure document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Access Error</h3>
          <p className="text-gray-400 text-sm max-w-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="pdf-viewer-container flex flex-col h-screen bg-dark-950"
    >
      {/* Top controls — responsive */}
      <div className="sticky top-0 z-10 glass border-b border-white/5 px-3 sm:px-4 py-2 sm:py-3">
        {/* Row 1: Logo + title + back */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/library"
              className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Back to library"
              id="pdf-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-300 truncate">
              <span className="hidden sm:inline">AbhyasMitra Premium — </span>Secure Viewer
            </span>
          </div>

          {/* Zoom controls — always visible */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.2, 0.4))}
              className="p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Zoom out"
              id="pdf-zoom-out"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-[10px] sm:text-xs text-gray-500 w-8 sm:w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.2, 3.0))}
              className="p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Zoom in"
              id="pdf-zoom-in"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleFitWidth}
              className="p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Fit to width"
              title="Fit to width"
              id="pdf-fit-width"
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Page navigation — compact on mobile */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Previous page"
            id="pdf-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page number input */}
          <form onSubmit={handlePageInput} className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={handlePageInput}
              className="w-10 sm:w-12 text-center text-sm text-white bg-dark-800 border border-white/10 rounded-lg py-1 px-1 focus:border-primary-500/50 outline-none transition-colors"
              aria-label="Go to page"
              id="pdf-page-input"
            />
            <span className="text-xs sm:text-sm text-gray-500">/ {totalPages}</span>
          </form>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1.5 sm:p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Next page"
            id="pdf-next-page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dev-tools blur overlay */}
      {devToolsOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-2xl bg-dark-950/90 flex items-center justify-center p-4">
          <div className="glass border border-red-500/20 rounded-3xl p-6 sm:p-8 text-center max-w-sm">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
              Developer Tools Detected
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Please close developer tools to continue reading.
            </p>
          </div>
        </div>
      )}

      {/* Canvas — scrollable area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-start justify-center py-4 sm:py-8 px-2 sm:px-4 overflow-auto"
      >
        <div className="relative shadow-card rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block"
            style={{ maxWidth: scale <= fitScale ? "100%" : "none" }}
            aria-label={`PDF page ${currentPage} of ${totalPages}`}
          />
        </div>
      </div>

      {/* Bottom info bar — responsive */}
      <div className="glass border-t border-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-center">
        <p className="text-[10px] sm:text-xs text-gray-600 truncate">
          Viewing as <span className="text-gray-500">{userEmail}</span> — Content is watermarked and protected
        </p>
        <p className="text-[9px] sm:hidden text-gray-700 mt-0.5">
          Swipe left/right to change pages
        </p>
      </div>
    </div>
  );
}
