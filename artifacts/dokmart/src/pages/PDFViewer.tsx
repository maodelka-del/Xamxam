import { useRoute, useSearch, Link } from "wouter";
import { ArrowLeft, Download, AlertTriangle, Loader2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function PDFViewer() {
  const [, params] = useRoute("/order/:orderId/view/:fileId");
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);

  const orderId = parseInt(params?.orderId ?? "0", 10);
  const fileId = parseInt(params?.fileId ?? "0", 10);
  const email = urlParams.get("email") ?? "";
  const fileName = urlParams.get("name") ?? "Document";

  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!orderId || !fileId || !email) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
        <div className="bg-zinc-800 rounded-2xl p-8 text-center max-w-sm shadow-2xl border border-zinc-700">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-zinc-400 text-sm mb-4">Paramètres manquants. Retournez au suivi de commande.</p>
          <Link href="/">
            <Button variant="outline" className="border-zinc-600 text-white hover:bg-zinc-700">Accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  const viewUrl = `/api/orders/${orderId}/view-file/${fileId}?email=${encodeURIComponent(email)}`;
  const downloadUrl = `${viewUrl}&download=1`;
  const backUrl = `/order/${orderId}?email=${encodeURIComponent(email)}`;
  const displayName = decodeURIComponent(fileName);

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Premium toolbar */}
      <div className="sticky top-0 z-20 bg-zinc-800/95 backdrop-blur-sm border-b border-zinc-700 flex items-center gap-3 px-4 py-3 shadow-xl">
        <Link href={backUrl}>
          <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Retour</span>
          </button>
        </Link>

        <div className="w-px h-5 bg-zinc-600 hidden sm:block" />

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-zinc-500">Document numérique · E-SERVICES</p>
          </div>
        </div>

        <a href={downloadUrl} download>
          <Button size="sm" variant="outline" className="gap-2 text-xs border-zinc-600 text-white hover:bg-zinc-700 flex-shrink-0">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </Button>
        </a>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative bg-zinc-900">
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">Chargement du document...</p>
              <p className="text-zinc-600 text-xs mt-1">Veuillez patienter</p>
            </div>
          </div>
        )}
        {iframeError ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 text-center max-w-sm shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">Affichage impossible</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Votre navigateur ne peut pas afficher ce PDF directement. Téléchargez-le pour le lire hors-ligne.
              </p>
              <a href={downloadUrl} download className="block">
                <Button className="gap-2 w-full">
                  <Download className="w-4 h-4" /> Télécharger le PDF
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <iframe
            src={viewUrl}
            className="w-full h-full border-0"
            style={{ minHeight: "calc(100vh - 61px)" }}
            title={displayName}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}
