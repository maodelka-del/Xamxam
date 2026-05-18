import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ShoppingCart, Check, FileText, Download, Star, Lock, Eye, Users, TrendingUp, BookOpen, Music, Layers, Code2, Image, Video, Globe, PlayCircle, BookMarked } from "lucide-react";
import { useGetDocument, useListDocuments, getGetDocumentQueryKey, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { DocumentCard, getCategoryStyle } from "@/components/DocumentCard";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DownloadPaymentDialog from "@/components/DownloadPaymentDialog";

const DOC_TYPE_LABELS: Record<string, string> = {
  cours: "Cours",
  td: "TD",
  tp: "TP",
  examen: "Examen",
  corrige: "Corrigé",
  annales: "Annales",
  fiche: "Fiche de révision",
  resume: "Résumé",
  exercices: "Exercices",
  qcm: "QCM",
  devoir: "Devoir",
  memoire: "Mémoire / Rapport",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  cours: "bg-blue-100 text-blue-800",
  td: "bg-purple-100 text-purple-800",
  tp: "bg-teal-100 text-teal-800",
  examen: "bg-red-100 text-red-800",
  corrige: "bg-green-100 text-green-800",
  annales: "bg-orange-100 text-orange-800",
  fiche: "bg-yellow-100 text-yellow-800",
  resume: "bg-gray-100 text-gray-800",
  exercices: "bg-indigo-100 text-indigo-800",
  qcm: "bg-pink-100 text-pink-800",
  devoir: "bg-cyan-100 text-cyan-800",
  memoire: "bg-rose-100 text-rose-800",
};

type ContentInfo = {
  format: string;
  lockText: string;
  fileLabel: string;
  previewType: "pdf" | "music" | "image" | "video" | "code" | "generic";
};

function getContentInfo(categoryName?: string | null): ContentInfo {
  const lower = (categoryName ?? "").toLowerCase();
  if (lower.includes("musique") || lower.includes("music") || lower.includes("audio"))
    return { format: "MP3 / WAV", lockText: "Achetez pour accéder au fichier audio", fileLabel: "Fichier audio haute qualité", previewType: "music" };
  if (lower.includes("video") || lower.includes("vidéo") || lower.includes("formation"))
    return { format: "MP4 / AVI", lockText: "Achetez pour accéder à la vidéo", fileLabel: "Vidéo haute définition", previewType: "video" };
  if (lower.includes("photo") || lower.includes("graphisme") || lower.includes("image"))
    return { format: "PNG / JPG", lockText: "Achetez pour accéder aux fichiers", fileLabel: "Fichiers image haute résolution", previewType: "image" };
  if (lower.includes("logiciel") || lower.includes("script") || lower.includes("theme") || lower.includes("thème") || lower.includes("site"))
    return { format: "ZIP", lockText: "Achetez pour télécharger le fichier", fileLabel: "Archive ZIP prête à l'emploi", previewType: "code" };
  if (lower.includes("template") || lower.includes("cv"))
    return { format: "DOCX / PDF", lockText: "Achetez pour accéder au template", fileLabel: "Template modifiable", previewType: "pdf" };
  if (lower.includes("ebook") || lower.includes("livre"))
    return { format: "PDF / EPUB", lockText: "Achetez pour lire l'ebook complet", fileLabel: "Ebook numérique haute qualité", previewType: "pdf" };
  return { format: "PDF", lockText: "Achetez pour accéder au contenu complet", fileLabel: "Fichier numérique haute qualité", previewType: "pdf" };
}

function ContentPreviewPlaceholder({ categoryName }: { categoryName?: string | null }) {
  const info = getContentInfo(categoryName);
  const style = getCategoryStyle(categoryName);
  const Icon = style.icon as React.ElementType;

  if (info.previewType === "music") {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center`} style={{ minHeight: 280 }}>
        <Music className="w-20 h-20 text-white/60 mb-4" />
        <div className="flex items-end gap-1 mb-6">
          {[3, 6, 4, 8, 5, 7, 3, 6, 4].map((h, i) => (
            <div key={i} className="bg-white/40 rounded-full w-2" style={{ height: h * 6 }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-6">
          <div className="bg-white/90 border border-white rounded-xl p-3 text-center shadow-lg">
            <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground mb-0.5">Contenu verrouillé</p>
            <p className="text-[10px] text-muted-foreground">Achetez pour écouter</p>
          </div>
        </div>
      </div>
    );
  }

  if (info.previewType === "image") {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br ${style.gradient} flex items-center justify-center`} style={{ minHeight: 280 }}>
        <Image className="w-20 h-20 text-white/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-6">
          <div className="bg-white/90 rounded-xl p-3 text-center shadow-lg">
            <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground mb-0.5">Contenu verrouillé</p>
            <p className="text-[10px] text-muted-foreground">Achetez pour accéder</p>
          </div>
        </div>
      </div>
    );
  }

  if (info.previewType === "video") {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br ${style.gradient} flex items-center justify-center`} style={{ minHeight: 280 }}>
        <Video className="w-20 h-20 text-white/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-6">
          <div className="bg-white/90 rounded-xl p-3 text-center shadow-lg">
            <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground mb-0.5">Contenu verrouillé</p>
            <p className="text-[10px] text-muted-foreground">Achetez pour visionner</p>
          </div>
        </div>
      </div>
    );
  }

  if (info.previewType === "code") {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br ${style.gradient} flex items-center justify-center`} style={{ minHeight: 280 }}>
        <Icon className="w-20 h-20 text-white/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-6">
          <div className="bg-white/90 rounded-xl p-3 text-center shadow-lg">
            <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground mb-0.5">Contenu verrouillé</p>
            <p className="text-[10px] text-muted-foreground">Achetez pour télécharger</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="space-y-1 p-3 pb-0">
        {[1, 2, 3].map((page) => (
          <div key={page} className={`bg-white rounded border border-gray-200 p-3 ${page === 1 ? "" : "opacity-70"}`} style={{ minHeight: page === 1 ? 140 : 80 }}>
            {page === 1 && (<>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-5/6 mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-4/5 mb-3" />
              <div className="h-2 bg-gray-200 rounded w-2/3 mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-full" />
            </>)}
            {page > 1 && (<>
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-5/6 mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-4/5" />
            </>)}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent flex flex-col items-center justify-end pb-6 px-4">
        <div className="bg-white border border-border rounded-xl p-4 text-center shadow-lg w-full max-w-[200px]">
          <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-xs font-semibold text-foreground mb-0.5">Contenu verrouillé</p>
          <p className="text-[10px] text-muted-foreground">Achetez pour accéder au contenu complet</p>
        </div>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const { data: doc, isLoading } = useGetDocument(id, { query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id) } });
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(id);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const { data: related } = useListDocuments(
    { level: doc?.level, limit: 5 },
    { query: { enabled: !!doc?.level, queryKey: getListDocumentsQueryKey({ level: doc?.level, limit: 5 }) } }
  );

  const formatPrice = (price: number) => price.toLocaleString("fr-FR") + " FCFA";

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Produit introuvable</h2>
        <Link href="/catalog">
          <Button variant="outline" className="mt-4">Retour au catalogue</Button>
        </Link>
      </div>
    );
  }

  const docType = (doc as any).docType as string | null;
  const semester = (doc as any).semester as string | null;
  const semesterLabel: Record<string, string> = { s1: "Semestre 1", s2: "Semestre 2", annuel: "Annuel" };
  const contentInfo = getContentInfo(doc.categoryName);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au catalogue
        </Link>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Preview */}
          <div className="md:col-span-2">
            {doc.previewUrl ? (
              <div className="aspect-[3/4] rounded-2xl border border-border overflow-hidden">
                <img src={doc.previewUrl} alt={doc.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <ContentPreviewPlaceholder categoryName={doc.categoryName} />
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm text-muted-foreground">
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-foreground">{doc.pageCount ?? "—"}</div>
                <div className="text-xs">Pages</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-foreground flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" />
                  {doc.downloadCount}
                </div>
                <div className="text-xs">Téléch.</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-foreground text-[11px] leading-tight">{contentInfo.format}</div>
                <div className="text-xs">Format</div>
              </div>
            </div>

            {/* Social proof */}
            {doc.downloadCount >= 10 && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-green-700 text-xs font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {doc.downloadCount}+ clients ont déjà téléchargé ce produit
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                  {doc.level}
                </span>
                {doc.categoryName && (
                  <span className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                    {doc.categoryName}
                  </span>
                )}
                {docType && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DOC_TYPE_COLORS[docType] ?? "bg-gray-100 text-gray-800"}`}>
                    {DOC_TYPE_LABELS[docType] ?? docType}
                  </span>
                )}
                {semester && (
                  <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {semesterLabel[semester] ?? semester}
                  </span>
                )}
                {doc.isFeatured && (
                  <span className="bg-secondary/20 text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Populaire
                  </span>
                )}
                {doc.downloadCount >= 100 && (
                  <span className="bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Très demandé
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>
                {doc.title}
              </h1>
              <p className="text-muted-foreground text-sm">Matière : <span className="font-medium text-foreground">{doc.subject}</span></p>
            </div>

            {doc.description && (
              <p className="text-foreground/80 leading-relaxed">{doc.description}</p>
            )}

            {/* Price box */}
            {doc.price === 0 ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl font-bold text-green-700" data-testid="text-price-detail">Gratuit</span>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full border border-green-300">🆓</span>
                </div>
                <p className="text-xs text-green-700/80">Lecture sécurisée directement dans l'application</p>
                {typeof (doc as any).downloadPrice === "number" && (doc as any).downloadPrice > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-800 font-semibold flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      Téléchargement disponible : {((doc as any).downloadPrice as number).toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/20">
                <div className="text-3xl font-bold text-primary mb-1" data-testid="text-price-detail">
                  {formatPrice(doc.price)}
                </div>
                <p className="text-xs text-muted-foreground">Paiement par Wave, Orange Money ou Free Money</p>
                {doc.downloadCount >= 5 && (
                  <p className="text-xs text-green-700 font-medium mt-1.5 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {doc.downloadCount} personnes ont acheté ce produit
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {doc.price === 0 ? (
                <>
                  <Link href={`/documents/${doc.id}/read`}>
                    <Button size="lg" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                      <BookOpen className="w-5 h-5" />
                      Lire maintenant — c'est gratuit
                    </Button>
                  </Link>
                  {typeof (doc as any).downloadPrice === "number" && (doc as any).downloadPrice > 0 && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/5"
                      onClick={() => setShowDownloadDialog(true)}
                    >
                      <Download className="w-5 h-5" />
                      Télécharger — {((doc as any).downloadPrice as number).toLocaleString("fr-FR")} FCFA
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      className="flex-1 gap-2"
                      onClick={() =>
                        addItem({
                          id: doc.id,
                          title: doc.title,
                          subject: doc.subject,
                          level: doc.level,
                          price: doc.price,
                        })
                      }
                      disabled={inCart}
                      data-testid="button-add-cart-detail"
                    >
                      {inCart ? (
                        <><Check className="w-5 h-5" /> Déjà dans le panier</>
                      ) : (
                        <><ShoppingCart className="w-5 h-5" /> Ajouter au panier</>
                      )}
                    </Button>
                    {inCart && (
                      <Link href="/cart">
                        <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                          Voir le panier
                        </Button>
                      </Link>
                    )}
                  </div>
                  {/* Integrated reader button — PDF/documents only */}
                  {contentInfo.previewType === "pdf" && (
                    <Link href={`/documents/${doc.id}/read`}>
                      <Button size="lg" variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5">
                        <BookOpen className="w-5 h-5" />
                        Lire l'aperçu dans l'application
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Reassurance */}
            <div className="grid grid-cols-2 gap-3">
              {doc.price === 0 ? (
                <>
                  <div className="flex items-start gap-2 text-sm bg-green-50 rounded-lg p-3 border border-green-100">
                    <BookOpen className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800 text-xs">Lecture en ligne uniquement — pas de téléchargement</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">{contentInfo.fileLabel}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Eye className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Accès immédiat, aucun compte requis</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Contenu de qualité, sélectionné par nos équipes</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Download className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Accès immédiat après validation du paiement</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">{contentInfo.fileLabel}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Paiement vérifié manuellement et sécurisé</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Satisfait ou remboursé, support 7j/7</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Related */}
        {related && related.documents.filter((d) => d.id !== doc.id).length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Produits similaires
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.documents.filter((d) => d.id !== doc.id).slice(0, 4).map((d) => (
                <DocumentCard key={d.id} doc={d} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Download payment dialog — only shown for free docs with downloadPrice */}
      {doc.price === 0 && typeof (doc as any).downloadPrice === "number" && (doc as any).downloadPrice > 0 && (
        <DownloadPaymentDialog
          open={showDownloadDialog}
          onClose={() => setShowDownloadDialog(false)}
          documentId={doc.id}
          documentTitle={doc.title}
          downloadPrice={(doc as any).downloadPrice as number}
        />
      )}
    </div>
  );
}
