import { Link } from "wouter";
import {
  ShoppingCart, Check, Star, Download, Eye,
  BookOpen, FileText, Layers, Music, Code2, Image, Video, Globe,
  BookMarked, PlayCircle, Zap,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: number;
  title: string;
  description: string;
  subject: string;
  level: string;
  categoryName?: string | null;
  price: number;
  previewUrl?: string | null;
  isFeatured: boolean;
  pageCount?: number | null;
  downloadCount: number;
}

interface DocumentCardProps {
  doc: Document;
}

type CatStyle = { icon: React.ElementType; gradient: string; light: string };

const CATEGORY_STYLES: Record<string, CatStyle> = {
  document:   { icon: BookOpen,   gradient: "from-emerald-500 to-green-600",  light: "bg-emerald-50 text-emerald-700" },
  ebook:      { icon: BookMarked, gradient: "from-blue-500 to-blue-700",      light: "bg-blue-50 text-blue-700" },
  livre:      { icon: BookMarked, gradient: "from-blue-500 to-blue-700",      light: "bg-blue-50 text-blue-700" },
  template:   { icon: Layers,     gradient: "from-violet-500 to-purple-600",  light: "bg-violet-50 text-violet-700" },
  cv:         { icon: Layers,     gradient: "from-violet-500 to-purple-600",  light: "bg-violet-50 text-violet-700" },
  musique:    { icon: Music,      gradient: "from-pink-500 to-rose-600",      light: "bg-pink-50 text-pink-700" },
  music:      { icon: Music,      gradient: "from-pink-500 to-rose-600",      light: "bg-pink-50 text-pink-700" },
  audio:      { icon: Music,      gradient: "from-pink-500 to-rose-600",      light: "bg-pink-50 text-pink-700" },
  logiciel:   { icon: Code2,      gradient: "from-teal-500 to-cyan-600",      light: "bg-teal-50 text-teal-700" },
  script:     { icon: Code2,      gradient: "from-teal-500 to-cyan-600",      light: "bg-teal-50 text-teal-700" },
  software:   { icon: Code2,      gradient: "from-teal-500 to-cyan-600",      light: "bg-teal-50 text-teal-700" },
  photo:      { icon: Image,      gradient: "from-orange-500 to-amber-500",   light: "bg-orange-50 text-orange-700" },
  graphisme:  { icon: Image,      gradient: "from-orange-500 to-amber-500",   light: "bg-orange-50 text-orange-700" },
  image:      { icon: Image,      gradient: "from-orange-500 to-amber-500",   light: "bg-orange-50 text-orange-700" },
  formation:  { icon: PlayCircle, gradient: "from-teal-500 to-emerald-600",   light: "bg-teal-50 text-teal-700" },
  video:      { icon: Video,      gradient: "from-red-500 to-rose-600",       light: "bg-red-50 text-red-700" },
  vidéo:      { icon: Video,      gradient: "from-red-500 to-rose-600",       light: "bg-red-50 text-red-700" },
  theme:      { icon: Globe,      gradient: "from-indigo-500 to-blue-600",    light: "bg-indigo-50 text-indigo-700" },
  thème:      { icon: Globe,      gradient: "from-indigo-500 to-blue-600",    light: "bg-indigo-50 text-indigo-700" },
  site:       { icon: Globe,      gradient: "from-indigo-500 to-blue-600",    light: "bg-indigo-50 text-indigo-700" },
};
const DEFAULT_STYLE: CatStyle = { icon: FileText, gradient: "from-primary to-primary/80", light: "bg-primary/10 text-primary" };

export function getCategoryStyle(categoryName?: string | null): CatStyle {
  if (!categoryName) return DEFAULT_STYLE;
  const lower = categoryName.toLowerCase();
  for (const [key, style] of Object.entries(CATEGORY_STYLES)) {
    if (lower === key || lower.includes(key)) return style;
  }
  return DEFAULT_STYLE;
}

const LEVEL_COLORS: Record<string, string> = {
  "CM1": "bg-yellow-100 text-yellow-800", "CM2": "bg-yellow-200 text-yellow-900",
  "6ème": "bg-cyan-100 text-cyan-800", "5ème": "bg-cyan-200 text-cyan-900",
  "4ème": "bg-sky-100 text-sky-800", "3ème": "bg-sky-200 text-sky-900",
  "Seconde": "bg-indigo-100 text-indigo-800", "Première": "bg-indigo-200 text-indigo-900",
  "Terminale": "bg-blue-100 text-blue-800",
  "BAC L": "bg-violet-100 text-violet-800", "BAC S1": "bg-blue-200 text-blue-900",
  "BAC S2": "bg-emerald-100 text-emerald-800", "BAC S3": "bg-teal-100 text-teal-800",
  "BAC G": "bg-orange-100 text-orange-800", "BAC T": "bg-amber-100 text-amber-800",
  "CFEE": "bg-lime-100 text-lime-800", "BFEM": "bg-rose-100 text-rose-800",
  "BTS": "bg-purple-100 text-purple-800", "DUT": "bg-purple-200 text-purple-900",
  "Licence L1": "bg-green-100 text-green-800", "Licence L2": "bg-green-200 text-green-900",
  "Licence L3": "bg-green-300 text-green-900", "Licence": "bg-green-100 text-green-800",
  "Master M1": "bg-orange-100 text-orange-800", "Master M2": "bg-orange-200 text-orange-900",
  "Master": "bg-orange-100 text-orange-800", "Doctorat": "bg-red-100 text-red-800",
  "Concours ENA": "bg-pink-100 text-pink-800", "Concours Police": "bg-slate-100 text-slate-800",
  "Concours Gendarmerie": "bg-slate-200 text-slate-900", "Concours Douanes": "bg-zinc-100 text-zinc-800",
  "Concours Santé": "bg-rose-100 text-rose-800", "Concours Enseignement": "bg-pink-200 text-pink-900",
  "Concours Armée": "bg-stone-100 text-stone-800",
};

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

export function DocumentCard({ doc }: DocumentCardProps) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(doc.id);
  const style = getCategoryStyle(doc.categoryName);
  const CatIcon = style.icon as React.ElementType;
  const levelColor = LEVEL_COLORS[doc.level] ?? "bg-gray-100 text-gray-700";
  const formatPrice = (p: number) => p.toLocaleString("fr-FR") + " FCFA";

  return (
    <div
      className="bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative"
      data-testid={`card-document-${doc.id}`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden">
        {doc.previewUrl ? (
          <img
            src={doc.previewUrl}
            alt={doc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
            <CatIcon className="w-14 h-14 text-white/80 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {doc.isFeatured && (
            <span className="bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
              <Star className="w-2.5 h-2.5 fill-current" /> Populaire
            </span>
          )}
          {!doc.isFeatured && doc.downloadCount >= 100 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Très demandé
            </span>
          )}
        </div>

        {/* Download count */}
        {doc.downloadCount > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Download className="w-2.5 h-2.5" /> {fmt(doc.downloadCount)}
          </div>
        )}

        {/* Category icon badge when preview image shown */}
        {doc.previewUrl && (
          <div className={`absolute bottom-2 left-2 w-7 h-7 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow`}>
            <CatIcon className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Hover overlay */}
        <Link href={`/documents/${doc.id}`}>
          <div className="absolute inset-0 bg-primary/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-white text-xs font-bold flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4" /> Voir le produit
            </span>
          </div>
        </Link>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColor}`}>
            {doc.level}
          </span>
          {doc.categoryName && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.light}`}>
              {doc.categoryName}
            </span>
          )}
        </div>

        <Link href={`/documents/${doc.id}`}>
          <h3 className="font-bold text-sm leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer">
            {doc.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">{doc.subject}</span>
          {doc.pageCount ? <span className="flex-shrink-0 ml-2">{doc.pageCount}p</span> : null}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          {doc.price === 0 ? (
            <>
              <Badge className="bg-green-100 text-green-800 border-green-200 font-bold text-xs px-2 py-0.5">
                Gratuit
              </Badge>
              <Link href={`/documents/${doc.id}/read`}>
                <Button size="sm" className="gap-1.5 text-xs h-8 px-3 bg-green-600 hover:bg-green-700 text-white">
                  <BookOpen className="w-3 h-3" /> Lire
                </Button>
              </Link>
            </>
          ) : (
            <>
              <span className="font-bold text-primary text-base" data-testid={`text-price-${doc.id}`}>
                {formatPrice(doc.price)}
              </span>
              <Button
                size="sm"
                variant={inCart ? "outline" : "default"}
                className="gap-1.5 text-xs h-8 px-3"
                onClick={() =>
                  addItem({ id: doc.id, title: doc.title, subject: doc.subject, level: doc.level, price: doc.price })
                }
                disabled={inCart}
                data-testid={`button-add-cart-${doc.id}`}
              >
                {inCart
                  ? <><Check className="w-3 h-3" /> Ajouté</>
                  : <><ShoppingCart className="w-3 h-3" /> Acheter</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
