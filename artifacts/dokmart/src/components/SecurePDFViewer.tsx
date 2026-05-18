import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";

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
  containerWidth,
  title,
}: {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  containerWidth: number;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderedRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !renderedRef.current) {
          renderedRef.current = true;
          renderPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [containerWidth]);

  const renderPage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = "100%";
      canvas.style.display = "block";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      await task.promise;

      drawWatermark(ctx, viewport.width, viewport.height, title);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF page render error", err);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="w-full bg-white rounded-lg overflow-hidden shadow-lg mb-3">
      <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
    </div>
  );
}

export default function SecurePDFViewer({ url, title = "Document", className = "" }: SecurePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isBlurred, setIsBlurred] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

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

    (async () => {
      try {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) { doc.destroy(); return; }

        pdfRef.current = doc;
        setNumPages(doc.numPages);
        setPdf(doc);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Erreur de chargement du document");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) setIsBlurred(true);
      else setIsBlurred(false);
    };
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
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

      {pdf && containerWidth > 0 && (
        <div className="w-full">
          {Array.from({ length: numPages }, (_, i) => (
            <PDFPage
              key={`${url}-${i + 1}`}
              pdf={pdf}
              pageNum={i + 1}
              containerWidth={containerWidth}
              title={title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
