import { useRoute, Link } from "wouter";
import { useState } from "react";
import { ArrowLeft, ShoppingCart, Lock, Loader2, AlertTriangle, BookOpen, Download, X, Music, Video, FileText, Image as ImageIcon, Code2, Eye, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useGetDocument, useGetDocumentFiles, getGetDocumentQueryKey, getGetDocumentFilesQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { getCategoryStyle } from "@/components/DocumentCard";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function getContentType(categoryName: string | null | undefined): "pdf" | "audio" | "video" | "image" | "code" | "archive" {
  const cat = (categoryName ?? "").toLowerCase();
  if (cat.includes("musique") || cat.includes("music") || cat.includes("audio")) return "audio";
  if (cat.includes("formation") || cat.includes("vidéo") || cat.includes("video")) return "video";
  if (cat.includes("photo") || cat.includes("graphisme") || cat.includes("image")) return "image";
  if (cat.includes("logiciel") || cat.includes("script") || cat.includes("theme") || cat.includes("site")) return "code";
  if (cat.includes("template") || cat.includes("cv") || cat.includes("modèle")) return "archive";
  return "pdf";
}

const FORMAT_LABELS: Record<string, string> = {
  pdf: "Document PDF",
  audio: "Fichier Audio (MP3 / WAV)",
  video: "Vidéo / Formation",
  image: "Fichier Image / Graphisme",
  code: "Logiciel / Script",
  archive: "Template / Archive ZIP",
};

const FORMAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  audio: Music,
  video: Video,
  image: ImageIcon,
  code: Code2,
  archive: FileText,
};

export default function DocumentReader() {
  const [, params] = useRoute("/documents/:id/read");
  const id = parseInt(params?.id ?? "0", 10);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: doc, isLoading } = useGetDocument(id, {
    query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id) },
  });
  const { data: files } = useGetDocumentFiles(id, {
    query: { enabled: !!id && doc?.price === 0, queryKey: getGetDocumentFilesQueryKey(id) },
  });
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Document introuvable</h2>
          <Link href="/catalog"><Button variant="outline">Retour au catalogue</Button></Link>
        </div>
      </div>
    );
  }

  const isFree = doc.price === 0;
  const style = getCategoryStyle(doc.categoryName);
  const CatIcon = style.icon as React.ElementType;
  const contentType = getContentType(doc.categoryName);
  const FormatIcon = FORMAT_ICONS[contentType];
  const formatLabel = FORMAT_LABELS[contentType];

  const isPdf = contentType === "pdf" && doc.previewUrl?.toLowerCase().endsWith(".pdf");
  const isAudio = contentType === "audio";
  const isVideo = contentType === "video";

  const freeFiles = files ?? [];
  const safeIndex = Math.min(selectedIndex, Math.max(0, freeFiles.length - 1));
  const currentFile = freeFiles[safeIndex];
  const currentFileUrl = currentFile
    ? `${BASE}/api/documents/${doc.id}/view-file/${currentFile.id}`
    : null;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-zinc-800 border-b border-zinc-700 flex items-center gap-3 px-4 py-2.5 shadow-lg">
        <Link href={`/documents/${doc.id}`}>
          <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className={`w-6 h-6 rounded bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0`}>
            <CatIcon className="w-3 h-3 text-white" />
          </div>
          <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
          {isFree && (
            <span className="flex-shrink-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" /> Lecture seule
            </span>
          )}
          {isFree && freeFiles.length > 1 && (
            <span className="flex-shrink-0 bg-zinc-600 text-zinc-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> {freeFiles.length} fichiers
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {doc.pageCount && (
            <span className="text-xs text-zinc-400 hidden sm:block">{doc.pageCount} pages</span>
          )}
          <Link href="/catalog">
            <button className="text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Reader area */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col items-center overflow-auto py-8 px-4">

          {/* ── FREE DOCUMENT: show actual files ── */}
          {isFree && (
            <>
              {freeFiles.length > 0 ? (
                <div className="w-full max-w-3xl">

                  {/* Multi-file navigation */}
                  {freeFiles.length > 1 && (
                    <div className="mb-4">
                      {/* Tabs for ≤5 files */}
                      {freeFiles.length <= 5 ? (
                        <div className="flex gap-2 flex-wrap">
                          {freeFiles.map((f, i) => (
                            <button
                              key={f.id}
                              onClick={() => setSelectedIndex(i)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                i === safeIndex
                                  ? "bg-green-600 text-white"
                                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                              }`}
                            >
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{f.fileName}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Prev / Next navigation for many files */
                        <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-2.5">
                          <button
                            onClick={() => setSelectedIndex(Math.max(0, safeIndex - 1))}
                            disabled={safeIndex === 0}
                            className="flex items-center gap-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" /> Précédent
                          </button>
                          <div className="text-center">
                            <p className="text-white text-xs font-semibold truncate max-w-[200px]">{currentFile?.fileName}</p>
                            <p className="text-zinc-500 text-[10px]">Fichier {safeIndex + 1} sur {freeFiles.length}</p>
                          </div>
                          <button
                            onClick={() => setSelectedIndex(Math.min(freeFiles.length - 1, safeIndex + 1))}
                            disabled={safeIndex === freeFiles.length - 1}
                            className="flex items-center gap-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
                          >
                            Suivant <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File viewer */}
                  {currentFileUrl && (
                    <iframe
                      key={currentFileUrl}
                      src={`${currentFileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full rounded-lg shadow-2xl border-0"
                      style={{ minHeight: "85vh" }}
                      title={currentFile?.fileName ?? doc.title}
                    />
                  )}

                  <div className="mt-4 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-green-300 text-xs">
                      Ce document est gratuit et disponible en lecture seule. Le téléchargement n'est pas autorisé.
                    </p>
                  </div>
                </div>
              ) : (
                /* Free but no file uploaded yet — show preview fallback */
                <div className="w-full max-w-2xl">
                  {isPdf && doc.previewUrl ? (
                    <iframe
                      src={`${doc.previewUrl}#toolbar=0&navpanes=0`}
                      className="w-full max-w-3xl rounded-lg shadow-2xl border-0"
                      style={{ minHeight: "85vh" }}
                      title={doc.title}
                    />
                  ) : (
                    <div className={`rounded-2xl bg-gradient-to-br ${style.gradient} p-16 text-center`}>
                      <FormatIcon className="w-20 h-20 text-white/80 mx-auto mb-4" />
                      <h2 className="text-white font-bold text-xl mb-2">{doc.title}</h2>
                      <p className="text-white/70 text-sm">Le fichier sera bientôt disponible</p>
                    </div>
                  )}
                  <div className="mt-4 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-green-300 text-xs">Ce document est gratuit — lecture en ligne uniquement.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PAID DOCUMENT: existing preview + paywall ── */}
          {!isFree && (
            <>
              {/* AUDIO PLAYER */}
              {isAudio && (
                <div className="w-full max-w-xl">
                  <div className={`rounded-2xl bg-gradient-to-br ${style.gradient} p-8 text-center mb-6`}>
                    <Music className="w-20 h-20 text-white/80 mx-auto mb-4" />
                    <h2 className="text-white font-bold text-xl mb-1">{doc.title}</h2>
                    <p className="text-white/60 text-sm">Aperçu musical — {doc.subject}</p>
                  </div>
                  {doc.previewUrl ? (
                    <div className="bg-zinc-800 rounded-2xl p-6">
                      <p className="text-zinc-400 text-xs mb-3 text-center uppercase tracking-wider">Extrait gratuit</p>
                      <audio controls className="w-full" style={{ colorScheme: "dark" }}>
                        <source src={doc.previewUrl} />
                        Votre navigateur ne supporte pas la lecture audio.
                      </audio>
                      <div className="mt-4 flex items-center gap-2 bg-zinc-700/50 rounded-xl px-4 py-3">
                        <Lock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <p className="text-zinc-400 text-xs">Achetez pour télécharger les fichiers complets</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-800 rounded-2xl p-8 text-center">
                      <Lock className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                      <p className="text-zinc-400 text-sm">Aperçu non disponible — achetez pour accéder au fichier audio complet</p>
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO PLAYER */}
              {isVideo && (
                <div className="w-full max-w-2xl">
                  {doc.previewUrl ? (
                    <div className="bg-zinc-800 rounded-2xl overflow-hidden">
                      <video controls className="w-full" style={{ maxHeight: "50vh" }}>
                        <source src={doc.previewUrl} />
                        Votre navigateur ne supporte pas la lecture vidéo.
                      </video>
                      <div className="px-4 py-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <p className="text-zinc-400 text-xs">Extrait gratuit — achetez pour accéder à la formation complète</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl bg-gradient-to-br ${style.gradient} p-12 text-center`}>
                      <Video className="w-20 h-20 text-white/80 mx-auto mb-4" />
                      <h2 className="text-white font-bold text-xl mb-2">{doc.title}</h2>
                      <p className="text-white/60 text-sm">Achetez pour accéder à la formation complète</p>
                    </div>
                  )}
                </div>
              )}

              {/* PDF VIEWER */}
              {!isAudio && !isVideo && doc.previewUrl && isPdf && (
                <iframe
                  src={doc.previewUrl}
                  className="w-full max-w-3xl rounded-lg shadow-2xl border-0"
                  style={{ minHeight: "85vh" }}
                  title={doc.title}
                />
              )}

              {/* IMAGE PREVIEW */}
              {!isAudio && !isVideo && doc.previewUrl && !isPdf && (
                <div className="w-full max-w-2xl space-y-4">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl">
                    <img src={doc.previewUrl} alt={doc.title} className="w-full" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent flex flex-col items-center justify-end pb-8 px-6">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-white/60 mx-auto mb-2" />
                        <p className="text-white font-semibold text-sm mb-1">Aperçu limité</p>
                        <p className="text-white/60 text-xs mb-4">Achetez pour accéder au contenu complet</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NO PREVIEW — Placeholder selon type */}
              {!isAudio && !isVideo && !doc.previewUrl && (
                <div className="w-full max-w-2xl">
                  {contentType === "pdf" || contentType === "archive" ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((page) => (
                        <div key={page} className={`bg-white rounded-xl shadow-lg p-8 ${page > 1 ? "opacity-40 blur-[2px]" : ""}`}>
                          {page === 1 ? (
                            <>
                              <div className="h-4 bg-gray-800 rounded w-2/3 mb-6" />
                              <div className="space-y-2 mb-4">
                                {[1,2,3,4,5].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded" style={{ width: `${70 + (i * 7) % 30}%` }} />)}
                              </div>
                              <div className="h-3 bg-gray-700 rounded w-1/2 mb-3 mt-6" />
                              <div className="space-y-2">
                                {[1,2,3].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded" style={{ width: `${60 + (i * 13) % 40}%` }} />)}
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2">
                              {[1,2,3,4].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded" style={{ width: `${50 + (i * 11) % 50}%` }} />)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`rounded-2xl bg-gradient-to-br ${style.gradient} p-16 text-center`}>
                      <FormatIcon className="w-20 h-20 text-white/80 mx-auto mb-4" />
                      <h2 className="text-white font-bold text-xl mb-2">{doc.title}</h2>
                      <p className="text-white/60 text-sm">Achetez pour accéder au fichier complet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Paywall banner */}
              <div className="w-full max-w-2xl mt-6">
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <FormatIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{doc.title}</h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    {doc.pageCount ? `${doc.pageCount} pages · ` : ""}{formatLabel}
                  </p>
                  <div className="text-3xl font-bold text-white mb-4">
                    {doc.price.toLocaleString("fr-FR")} <span className="text-lg text-zinc-400">FCFA</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full gap-2 mb-3"
                    onClick={() => addItem({ id: doc.id, title: doc.title, subject: doc.subject, level: doc.level, price: doc.price })}
                    disabled={inCart}
                  >
                    {inCart
                      ? <><BookOpen className="w-5 h-5" /> Ajouté au panier</>
                      : <><ShoppingCart className="w-5 h-5" /> Acheter pour accéder</>}
                  </Button>
                  {inCart && (
                    <Link href="/cart">
                      <Button size="lg" variant="outline" className="w-full gap-2 text-white border-zinc-600 hover:bg-zinc-700">
                        <Download className="w-4 h-4" /> Aller au panier
                      </Button>
                    </Link>
                  )}
                  <p className="text-zinc-500 text-xs mt-3">Paiement Wave · Orange Money · Free Money · Accès immédiat</p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
