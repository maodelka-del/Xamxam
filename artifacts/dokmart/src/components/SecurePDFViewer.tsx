import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, AlertTriangle, ShieldAlert, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
pdfjsLib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;

interface SecurePDFViewerProps {
  url: string;
  title?: string;
  className?: string;
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  ctx.save();
  const fontSize = Math.max(10, Math.round(w / 55));
  ctx.font = `${fontSize}px sans-serif`;
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  const text = `E-SERVICES · ${label} · Protégé`;
  const textWidth = ctx.measureText(text).width;
  const gapX = textWidth + fontSize * 5;
  const gapY = fontSize * 5;
  const cols = Math.ceil(w / gapX) + 2;
  const rows = Math.ceil(h / gapY) + 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.save();
      const x = col * gapX - (row % 2 === 0 ? 0 : gapX / 2);
      const y = row * gapY;
      ctx.translate(x + textWidth / 2, y + fontSize * 2);
      ctx.rotate(-Math.PI / 7);
      ctx.fillText(text, -textWidth / 2, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

function PDFPage({
  pdf,
  pageNum,
  renderWidth,
  title,
}: {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  renderWidth: number;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderedWidthRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible(true); },
      { rootMargin: "400px" }
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || renderWidth <= 0) return;
    if (Math.abs(renderedWidthRef.current - renderWidth) < 2) return;
    renderedWidthRef.current = renderWidth;

    const canvas = canvasRef.current;
    if (!canvas) return;
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        const scale = (renderWidth / baseViewport.width) * dpr;
        const viewport = page.getViewport({ scale });

        // Physical pixels = DPR × CSS pixels → sharp on HiDPI/Retina screens
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        drawWatermark(ctx, viewport.width, viewport.height, title);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error("PDF page error", err);
      }
    })();
  }, [visible, renderWidth, pdf, pageNum, title]);

  return (
    <div ref={wrapperRef} className="w-full bg-white rounded-lg overflow-hidden shadow mb-3">
      {!visible ? (
        <div className="flex items-center justify-center bg-zinc-800 min-h-32">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto" }} />
      )}
    </div>
  );
}

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
const DEFAULT_ZOOM = 1.0;

export default function SecurePDFViewer({ url, title = "Document", className = "" }: SecurePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isBlurred, setIsBlurred] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const renderWidth = containerWidth > 0 ? Math.round(containerWidth * zoom) : 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerWidth(Math.floor(w));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    pdfRef.current?.destroy();
    pdfRef.current = null;
    setPdf(null);
    setLoading(true);
    setError(null);
    setZoom(DEFAULT_ZOOM);

    // Use streaming load: pass URL + withCredentials directly to pdfjs
    // pdfjs fetches in chunks, so first pages appear before full download
    const loadingTask = pdfjsLib.getDocument({ url, withCredentials: true });
    let doc: pdfjsLib.PDFDocumentProxy | null = null;

    loadingTask.promise.then((loaded) => {
      if (cancelled) { loaded.destroy(); return; }
      doc = loaded;
      pdfRef.current = loaded;
      setNumPages(loaded.numPages);
      setPdf(loaded);
      setLoading(false);
    }).catch((err: any) => {
      if (!cancelled) {
        setError(err?.message ?? "Erreur de chargement");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
      doc?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key?.toLowerCase();
      if (key === "printscreen" || (ctrl && key === "p") || (ctrl && key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 2000);
      }
    };
    const beforePrint = () => setIsBlurred(true);
    const afterPrint = () => setIsBlurred(false);
    const onVisibility = () => { if (document.hidden) setIsBlurred(true); else setIsBlurred(false); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  // Pinch-to-zoom touch handling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startDist = 0;
    let startZoom = 1;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = getDistance(e.touches);
        setZoom((z) => { startZoom = z; return z; });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // block native browser zoom
        const dist = getDistance(e.touches);
        if (startDist === 0) return;
        const ratio = dist / startDist;
        const next = Math.min(3.0, Math.max(0.5, startZoom * ratio));
        setZoom(Math.round(next * 100) / 100);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z);
      return next ?? z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_STEPS].reverse().find((s) => s < z);
      return prev ?? z;
    });
  }, []);

  const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const canZoomIn = zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1];
  const canZoomOut = zoom > ZOOM_STEPS[0];

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`}
      onContextMenu={handleContextMenu}
      style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
    >
      {isBlurred && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-white font-bold text-xl mb-2">Contenu protégé</p>
          <p className="text-zinc-400 text-sm text-center max-w-xs">
            Ce document est protégé contre la capture d'écran et l'impression.
          </p>
        </div>
      )}

      {/* Toolbar */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700 rounded-t-lg sticky top-0 z-10">
          <span className="text-xs text-zinc-400 truncate max-w-[50%]">{title}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700"
              onClick={zoomOut}
              disabled={!canZoomOut}
              title="Dézoomer"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <button
              className="text-xs text-zinc-200 px-2 py-1 rounded hover:bg-zinc-700 min-w-[46px] text-center"
              onClick={resetZoom}
              title="Réinitialiser le zoom"
            >
              {zoomLabel}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700"
              onClick={zoomIn}
              disabled={!canZoomIn}
              title="Zoomer"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700"
              onClick={resetZoom}
              title="Zoom réel"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-zinc-800 p-3"
        style={{ minHeight: 0 }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Chargement du document…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 max-w-sm text-center mx-auto">
            <AlertTriangle className="w-10 h-10 mb-3 text-yellow-400" />
            <p className="text-sm font-semibold text-white mb-1">Erreur de chargement</p>
            <p className="text-xs">{error}</p>
          </div>
        )}

        {pdf && renderWidth > 0 && (
          <div
            style={{
              width: zoom > 1 ? `${renderWidth}px` : "100%",
              margin: "0 auto",
              transition: "width 0.15s ease",
            }}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <PDFPage
                key={`${url}-p${i + 1}`}
                pdf={pdf}
                pageNum={i + 1}
                renderWidth={renderWidth}
                title={title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
