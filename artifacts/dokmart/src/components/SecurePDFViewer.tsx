import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ShieldAlert } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface SecurePDFViewerProps {
  url: string;
  title?: string;
  className?: string;
}

function drawWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, title: string) {
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  ctx.save();

  const fontSize = Math.max(11, Math.round((w / 70))) * dpr;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#1a1a1a";

  const text = `E-SERVICES · ${title} · ${new Date().toLocaleDateString("fr-FR")} · Protégé`;
  const textWidth = ctx.measureText(text).width;

  const cols = Math.ceil(w / (textWidth + fontSize * 4)) + 2;
  const rows = Math.ceil(h / (fontSize * 6)) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.save();
      const x = col * (textWidth + fontSize * 4) - (row % 2 === 0 ? 0 : textWidth / 2);
      const y = row * fontSize * 6;
      ctx.translate(x + textWidth / 2, y + fontSize * 3);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(text, -textWidth / 2, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}

export default function SecurePDFViewer({ url, title = "Document", className = "" }: SecurePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isBlurred, setIsBlurred] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderingRef = useRef(false);

  const renderPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number, scaleVal: number) => {
    if (!canvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    if (renderingRef.current) return;

    renderingRef.current = true;
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = window.devicePixelRatio || 1;
      const baseViewport = page.getViewport({ scale: 1 });
      const containerWidth = Math.min(window.innerWidth - 48, 900);
      const autoScale = (containerWidth / baseViewport.width) * scaleVal;
      const viewport = page.getViewport({ scale: autoScale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const task = page.render({ canvasContext: context, viewport, canvas });
      renderTaskRef.current = task;
      await task.promise;

      drawWatermark(context, canvas, title);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF render error", err);
      }
    } finally {
      renderingRef.current = false;
    }
  }, [title]);

  useEffect(() => {
    let cancelled = false;
    pdfRef.current?.destroy();
    pdfRef.current = null;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    (async () => {
      try {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Impossible de charger le document");
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) { pdf.destroy(); return; }

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
        await renderPage(pdf, 1, scale);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Erreur lors du chargement du document");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (pdfRef.current && !loading) {
      renderingRef.current = false;
      renderPage(pdfRef.current, currentPage, scale);
    }
  }, [currentPage, scale]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) setIsBlurred(true);
      else setIsBlurred(false);
    };

    const handleWindowBlur = () => setIsBlurred(true);
    const handleWindowFocus = () => setIsBlurred(false);

    const blockPrint = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        key === "printscreen" ||
        (ctrl && key === "p") ||
        (ctrl && key === "s") ||
        (ctrl && e.shiftKey && key === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 2000);
      }
    };

    const handleBeforePrint = () => setIsBlurred(true);
    const handleAfterPrint = () => setIsBlurred(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keydown", blockPrint, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keydown", blockPrint, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();
  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(numPages, page)));
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  return (
    <div
      className={`flex flex-col items-center relative ${className}`}
      onContextMenu={handleContextMenu}
      style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
    >
      {/* Anti-screenshot overlay */}
      {isBlurred && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "#000", backdropFilter: "blur(20px)" }}
        >
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
          <p className="text-xs mt-1 text-zinc-500">Rendu via lecteur intégré</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 max-w-sm text-center">
          <AlertTriangle className="w-10 h-10 mb-3 text-yellow-400" />
          <p className="text-sm font-semibold text-white mb-1">Erreur de chargement</p>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {numPages > 1 && (
            <div className="flex items-center gap-3 mb-4 bg-zinc-800 rounded-xl px-4 py-2 text-sm">
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-300 text-xs font-medium min-w-[80px] text-center">
                Page {currentPage} / {numPages}
              </span>
              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === numPages}
                className="text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-600 mx-1" />
              <button onClick={zoomOut} className="text-zinc-400 hover:text-white" title="Réduire">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-500 text-xs w-8 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="text-zinc-400 hover:text-white" title="Agrandir">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="relative select-none">
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-2xl"
              title={title}
            />
            {/* Transparent interaction-blocker overlay — prevents drag-to-save on canvas */}
            <div
              className="absolute inset-0 rounded-lg"
              style={{ background: "transparent", pointerEvents: "none" }}
              aria-hidden="true"
            />
          </div>

          {numPages > 1 && (
            <div className="flex items-center gap-2 mt-4">
              {Array.from({ length: Math.min(numPages, 9) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => goTo(page)}
                    className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                      page === currentPage ? "bg-primary text-white" : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {numPages > 9 && <span className="text-zinc-500 text-xs">…{numPages}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
