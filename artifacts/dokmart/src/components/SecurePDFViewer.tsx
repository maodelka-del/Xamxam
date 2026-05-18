import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, AlertTriangle, ShieldAlert, ZoomIn, ZoomOut, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
pdfjsLib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;

interface SecurePDFViewerProps {
  url: string;
  title?: string;
  className?: string;
}

// ── Copyright protection drawn directly onto the canvas pixels ──────────────
function drawCopyrightProtection(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
) {
  const today = new Date().toLocaleDateString("fr-FR");

  // 1. Header bar — solid dark green strip baked into every page
  const barH = Math.round(h * 0.038);
  const barFont = Math.max(8, Math.round(barH * 0.52));
  ctx.save();
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, 0, w, barH);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${barFont}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "© E-SERVICES — DOCUMENT PROTÉGÉ PAR LE DROIT D'AUTEUR — REPRODUCTION INTERDITE",
    w / 2,
    barH / 2,
  );
  ctx.restore();

  // 2. Footer bar — with date and platform name
  ctx.save();
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, h - barH, w, barH);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${barFont}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `© ${today} — E-SERVICES.COM — Téléchargez l'original pour supprimer cette protection`,
    w / 2,
    h - barH / 2,
  );
  ctx.restore();

  // 3. Dense diagonal tiled watermark (high density, medium opacity)
  ctx.save();
  const wFontSize = Math.max(11, Math.round(w / 48));
  ctx.font = `${wFontSize}px sans-serif`;
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#000";
  const waterText = `© E-SERVICES · ${label} · PROTÉGÉ`;
  const tw = ctx.measureText(waterText).width;
  const gapX = tw + wFontSize * 3.5;
  const gapY = wFontSize * 4.5;
  const cols = Math.ceil(w / gapX) + 3;
  const rows = Math.ceil(h / gapY) + 3;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.save();
      const x = col * gapX - (row % 2 === 0 ? 0 : gapX / 2);
      const y = row * gapY;
      ctx.translate(x + tw / 2, y + wFontSize * 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(waterText, -tw / 2, 0);
      ctx.restore();
    }
  }
  ctx.restore();

  // 4. Big diagonal "PROTÉGÉ" ghost stamp across the full page
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = "#000";
  const bigSize = Math.round(w / 7);
  ctx.font = `900 ${bigSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 5);
  ctx.fillText("PROTÉGÉ", 0, 0);
  ctx.restore();

  // 5. Fine dot-grid overlay (makes screenshots grainy / low quality)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#888";
  const dotStep = Math.max(4, Math.round(w / 160));
  for (let x = 0; x < w; x += dotStep) {
    for (let y = 0; y < h; y += dotStep) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();

  // 6. Corner stamps
  const corners = [
    { x: 8,       y: barH + 8,     align: "left" as const },
    { x: w - 8,   y: barH + 8,     align: "right" as const },
    { x: 8,       y: h - barH - 8, align: "left" as const },
    { x: w - 8,   y: h - barH - 8, align: "right" as const },
  ];
  const cFont = Math.max(7, Math.round(w / 70));
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#14532d";
  ctx.font = `bold ${cFont}px sans-serif`;
  ctx.textBaseline = "top";
  for (const c of corners) {
    ctx.textAlign = c.align;
    ctx.fillText("© E-SERVICES", c.x, c.y);
  }
  ctx.restore();
}

// ── Single page component ────────────────────────────────────────────────────
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
      { rootMargin: "400px" },
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

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;

        // Bake all copyright protection into the canvas pixels
        drawCopyrightProtection(ctx, viewport.width, viewport.height, title);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error("PDF page error", err);
      }
    })();
  }, [visible, renderWidth, pdf, pageNum, title]);

  return (
    <div ref={wrapperRef} className="relative w-full bg-white rounded-lg overflow-hidden shadow mb-3">
      {!visible ? (
        <div className="flex items-center justify-center bg-zinc-800 min-h-32">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto" }} />
          {/* CSS scanline overlay — adds visual noise to screenshots (pointer-events: none) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 4px)",
              zIndex: 2,
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Zoom steps ───────────────────────────────────────────────────────────────
const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
const DEFAULT_ZOOM = 1.0;

// ── Main viewer ──────────────────────────────────────────────────────────────
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

  // Container width observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerWidth(Math.floor(w));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Streaming PDF load
  useEffect(() => {
    let cancelled = false;
    pdfRef.current?.destroy();
    pdfRef.current = null;
    setPdf(null);
    setLoading(true);
    setError(null);
    setZoom(DEFAULT_ZOOM);

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
      if (!cancelled) { setError(err?.message ?? "Erreur de chargement"); setLoading(false); }
    });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
      doc?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  // Anti-screenshot / anti-print guards
  useEffect(() => {
    const blur = () => setIsBlurred(true);
    const unblur = () => setIsBlurred(false);

    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key?.toLowerCase();
      if (
        key === "printscreen" ||
        key === "prtsc" ||
        key === "sysrq" ||
        (ctrl && key === "p") ||
        (ctrl && key === "s") ||
        (ctrl && e.shiftKey && key === "s") ||
        (ctrl && e.shiftKey && key === "3") ||
        (ctrl && e.shiftKey && key === "4") ||
        (ctrl && e.shiftKey && key === "5")
      ) {
        e.preventDefault();
        e.stopPropagation();
        blur();
        setTimeout(unblur, 2500);
      }
    };

    // Detect screen recording/sharing (desktop browsers)
    const checkScreenCapture = () => {
      if ("mediaDevices" in navigator) {
        navigator.mediaDevices.addEventListener("devicechange", blur);
      }
    };

    const onVisibility = () => { if (document.hidden) blur(); else unblur(); };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("beforeprint", blur);
    window.addEventListener("afterprint", unblur);
    checkScreenCapture();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("beforeprint", blur);
      window.removeEventListener("afterprint", unblur);
    };
  }, []);

  // Pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) { startDist = dist(e.touches); setZoom((z) => { startZoom = z; return z; }); } };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = dist(e.touches) / startDist;
      setZoom(Math.round(Math.min(3.0, Math.max(0.5, startZoom * ratio)) * 100) / 100);
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) startDist = 0; };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); };
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => ZOOM_STEPS.find((s) => s > z) ?? z), []);
  const zoomOut = useCallback(() => setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z) ?? z), []);
  const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), []);
  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`}
      onContextMenu={handleContextMenu}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        MozUserSelect: "none",
      } as React.CSSProperties}
    >
      {/* Full-screen black-out on capture attempt */}
      {isBlurred && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
          <ShieldAlert className="w-20 h-20 text-red-500 mb-4" />
          <p className="text-white font-bold text-2xl mb-2">Capture bloquée</p>
          <p className="text-zinc-400 text-sm text-center max-w-xs px-4">
            Ce document est protégé par le droit d'auteur. Toute reproduction est interdite.
          </p>
          <p className="text-zinc-500 text-xs mt-3">© E-SERVICES — Tous droits réservés</p>
        </div>
      )}

      {/* Toolbar */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700 rounded-t-lg sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="text-xs text-zinc-400 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700" onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]} title="Dézoomer">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <button className="text-xs text-zinc-200 px-2 py-1 rounded hover:bg-zinc-700 min-w-[46px] text-center" onClick={resetZoom}>
              {zoomLabel}
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700" onClick={zoomIn} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} title="Zoomer">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700" onClick={resetZoom} title="Zoom réel">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Copyright notice banner */}
      {!loading && !error && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-950 text-green-300 text-[11px] font-medium border-b border-green-900">
          <Lock className="w-3 h-3 flex-shrink-0" />
          <span>Document protégé — © E-SERVICES. Reproduction et capture interdites. Téléchargez l'original pour une version sans filigrane.</span>
        </div>
      )}

      {/* Scrollable content */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-zinc-800 p-3" style={{ minHeight: 0 }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Chargement sécurisé…</p>
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
          <div style={{ width: zoom > 1 ? `${renderWidth}px` : "100%", margin: "0 auto", transition: "width 0.15s ease" }}>
            {Array.from({ length: numPages }, (_, i) => (
              <PDFPage key={`${url}-p${i + 1}`} pdf={pdf} pageNum={i + 1} renderWidth={renderWidth} title={title} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
