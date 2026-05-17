import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  Store, LogOut, Package, TrendingUp, BookOpen, FileText,
  Layers, Music, Code2, Image, Globe, Video, User, Mail, Phone,
  Plus, Upload, X, CheckCircle, Clock, AlertCircle, ChevronRight,
  ShoppingBag, Star, Eye, Send, HelpCircle, ExternalLink, Trash2,
  Pencil, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const PRODUCT_TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  documents:  { label: "Documents éducatifs", icon: BookOpen,  color: "text-blue-600 bg-blue-50" },
  ebooks:     { label: "Ebooks & Livres",      icon: FileText,  color: "text-purple-600 bg-purple-50" },
  templates:  { label: "Templates & CV",        icon: Layers,    color: "text-indigo-600 bg-indigo-50" },
  musique:    { label: "Musique & Audio",        icon: Music,     color: "text-pink-600 bg-pink-50" },
  logiciels:  { label: "Logiciels & Scripts",   icon: Code2,     color: "text-gray-600 bg-gray-50" },
  graphismes: { label: "Photos & Graphismes",   icon: Image,     color: "text-orange-600 bg-orange-50" },
  formations: { label: "Vidéos & Formations",   icon: Video,     color: "text-red-600 bg-red-50" },
  themes:     { label: "Sites Web & Thèmes",    icon: Globe,     color: "text-teal-600 bg-teal-50" },
};

type SellerContentCategory = "academique" | "musique" | "template" | "ebook" | "logiciel" | "graphisme" | "formation" | "theme";

const SELLER_CATEGORIES: Array<{
  value: SellerContentCategory;
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "academique", label: "Académique",       emoji: "📚", icon: BookOpen },
  { value: "musique",    label: "Musique & Audio",  emoji: "🎵", icon: Music },
  { value: "template",   label: "Template / CV",    emoji: "📋", icon: Layers },
  { value: "ebook",      label: "Ebook & Livre",    emoji: "📖", icon: FileText },
  { value: "logiciel",   label: "Logiciel / Script",emoji: "💻", icon: Code2 },
  { value: "graphisme",  label: "Graphisme / Photo", emoji: "🖼️", icon: Image },
  { value: "formation",  label: "Formation Vidéo",  emoji: "🎬", icon: Video },
  { value: "theme",      label: "Site Web / Thème", emoji: "🌐", icon: Globe },
];

const SELLER_CAT_CONFIG: Record<SellerContentCategory, {
  subjectLabel: string;
  subjectPlaceholder: string;
  levelValue: string;
  fileAccept: string;
  fileHint: string;
  docTypes?: { value: string; label: string; emoji: string }[];
}> = {
  academique: {
    subjectLabel: "Matière / Domaine",
    subjectPlaceholder: "Ex: Mathématiques, Physique, Histoire…",
    levelValue: "general",
    fileAccept: ".pdf,application/pdf",
    fileHint: "Fichiers PDF uniquement",
    docTypes: [
      { value: "cours",      label: "Cours",     emoji: "📖" },
      { value: "td",         label: "TD",        emoji: "✏️" },
      { value: "examen",     label: "Examen",    emoji: "📝" },
      { value: "corrige",    label: "Corrigé",   emoji: "✅" },
      { value: "annales",    label: "Annales",   emoji: "📚" },
      { value: "fiche",      label: "Fiche",     emoji: "🗂️" },
      { value: "resume",     label: "Résumé",    emoji: "📄" },
      { value: "memoire",    label: "Mémoire",   emoji: "🎓" },
    ],
  },
  musique: {
    subjectLabel: "Artiste / Auteur",
    subjectPlaceholder: "Ex: Votre nom d'artiste, Youssou N'Dour…",
    levelValue: "musique",
    fileAccept: ".mp3,.wav,.flac,.aac,.ogg,audio/*,.zip",
    fileHint: "MP3, WAV, FLAC ou archive ZIP",
    docTypes: [
      { value: "single",       label: "Single",       emoji: "🎵" },
      { value: "album",        label: "Album",        emoji: "💿" },
      { value: "instrumental", label: "Instrumental", emoji: "🎹" },
      { value: "beat",         label: "Beat",         emoji: "🥁" },
      { value: "podcast",      label: "Podcast",      emoji: "🎙️" },
    ],
  },
  template: {
    subjectLabel: "Type de template",
    subjectPlaceholder: "Ex: CV professionnel, Présentation PowerPoint…",
    levelValue: "templates",
    fileAccept: ".pdf,.docx,.xlsx,.pptx,.zip",
    fileHint: "PDF, Word, Excel, PowerPoint ou ZIP",
    docTypes: [
      { value: "cv",           label: "CV",           emoji: "👔" },
      { value: "presentation", label: "Présentation", emoji: "📊" },
      { value: "contrat",      label: "Contrat",      emoji: "📜" },
      { value: "facture",      label: "Facture",      emoji: "🧾" },
      { value: "autre",        label: "Autre",        emoji: "📁" },
    ],
  },
  ebook: {
    subjectLabel: "Thème / Genre",
    subjectPlaceholder: "Ex: Développement personnel, Roman, Guide pratique…",
    levelValue: "ebooks",
    fileAccept: ".pdf,.epub",
    fileHint: "Fichiers PDF ou ePub",
    docTypes: [
      { value: "roman",      label: "Roman",      emoji: "📗" },
      { value: "guide",      label: "Guide",      emoji: "📘" },
      { value: "manuel",     label: "Manuel",     emoji: "📙" },
      { value: "biographie", label: "Biographie", emoji: "👤" },
      { value: "autre",      label: "Autre",      emoji: "📄" },
    ],
  },
  logiciel: {
    subjectLabel: "Type de logiciel / script",
    subjectPlaceholder: "Ex: Application Android, Script Python, Plugin WordPress…",
    levelValue: "logiciels",
    fileAccept: ".zip,.rar,.7z",
    fileHint: "Archive ZIP, RAR ou 7Z",
    docTypes: [
      { value: "application", label: "Application", emoji: "📱" },
      { value: "script",      label: "Script",      emoji: "⚙️" },
      { value: "plugin",      label: "Plugin",      emoji: "🔌" },
      { value: "autre",       label: "Autre",       emoji: "💻" },
    ],
  },
  graphisme: {
    subjectLabel: "Type de contenu graphique",
    subjectPlaceholder: "Ex: Pack logos, Illustrations vectorielles, Photos…",
    levelValue: "graphismes",
    fileAccept: ".jpg,.jpeg,.png,.svg,.ai,.psd,.zip",
    fileHint: "Images JPG/PNG/SVG ou archive ZIP",
    docTypes: [
      { value: "logo",        label: "Logo",        emoji: "🎨" },
      { value: "illustration",label: "Illustration", emoji: "🖼️" },
      { value: "photo",       label: "Photo",       emoji: "📷" },
      { value: "pack",        label: "Pack",        emoji: "📦" },
      { value: "autre",       label: "Autre",       emoji: "✏️" },
    ],
  },
  formation: {
    subjectLabel: "Domaine de formation",
    subjectPlaceholder: "Ex: Marketing digital, Design graphique, Programmation…",
    levelValue: "formations",
    fileAccept: ".mp4,.mov,.avi,.zip",
    fileHint: "Vidéo MP4/MOV ou archive ZIP",
    docTypes: [
      { value: "formation",   label: "Formation",   emoji: "🎓" },
      { value: "tutoriel",    label: "Tutoriel",    emoji: "📺" },
      { value: "masterclass", label: "Masterclass", emoji: "⭐" },
      { value: "autre",       label: "Autre",       emoji: "🎬" },
    ],
  },
  theme: {
    subjectLabel: "Type de thème / site",
    subjectPlaceholder: "Ex: Thème WordPress e-commerce, Landing page React…",
    levelValue: "themes",
    fileAccept: ".zip",
    fileHint: "Archive ZIP contenant le thème complet",
    docTypes: [
      { value: "wordpress", label: "WordPress", emoji: "🌐" },
      { value: "html",      label: "HTML/CSS",  emoji: "💻" },
      { value: "react",     label: "React/Vue", emoji: "⚛️" },
      { value: "autre",     label: "Autre",     emoji: "🔧" },
    ],
  },
};

const SELLER_CATEGORY_SLUG: Record<SellerContentCategory, string> = {
  academique: "academique",
  musique:    "musique",
  template:   "templates",
  ebook:      "ebooks",
  logiciel:   "logiciels",
  graphisme:  "graphismes",
  formation:  "formations",
  theme:      "themes",
};

const SEMESTERS = [
  { value: "S1", label: "Semestre 1" },
  { value: "S2", label: "Semestre 2" },
  { value: "annuel", label: "Annuel (toute l'année)" },
];

interface LevelOption { id: number; name: string; slug: string; group: string | null; }
interface SubjectOption { id: number; name: string; slug: string; }

interface SellerInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  productType: string;
  createdAt: string;
}

interface SellerProduct {
  id: number;
  title: string;
  description: string;
  subject: string;
  price: number;
  categoryName: string | null;
  previewUrl: string | null;
  downloadCount: number;
  isFeatured: boolean;
  createdAt: string;
}

interface SellerStats {
  productCount: number;
  salesCount: number;
  revenue: number;
  totalViews: number;
}

type TabKey = "overview" | "submit" | "products" | "profile";


function StatCard({ emoji, value, label, sub }: { emoji: string; value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>{value}</div>
      <div className="text-sm font-semibold mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SubmitProductForm({
  seller,
  apiBase,
  onSuccess,
}: {
  seller: SellerInfo;
  apiBase: string;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<SellerContentCategory>("academique");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectManual, setSubjectManual] = useState("");
  const [docType, setDocType] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [price, setPrice] = useState("");
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const coverRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const config = SELLER_CAT_CONFIG[category];

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/levels`).then(r => r.ok ? r.json() : []),
      fetch(`${apiBase}/api/categories`).then(r => r.ok ? r.json() : []),
    ]).then(([lvls, cats]) => {
      setLevelOptions(lvls as LevelOption[]);
      setSubjectOptions(cats as SubjectOption[]);
    });
  }, [apiBase]);

  const levelsByGroup = levelOptions.reduce<Record<string, LevelOption[]>>((acc, l) => {
    const g = l.group ?? "Autres";
    if (!acc[g]) acc[g] = [];
    acc[g].push(l);
    return acc;
  }, {});

  const handleCategoryChange = (cat: SellerContentCategory) => {
    setCategory(cat);
    setSubject("");
    setSubjectManual("");
    setDocType("");
    setFiles([]);
    setIsFree(false);
    if (cat !== "academique") { setLevel(""); setSemester(""); }
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, j) => j !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Le titre est obligatoire", variant: "destructive" }); return; }
    if (!isFree && (!price || isNaN(Number(price)) || Number(price) < 100)) {
      toast({ title: "Entrez un prix valide (minimum 100 FCFA) pour un produit Premium", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let previewUrl: string | null = null;
      if (coverPhoto) {
        setProgress("Téléchargement de l'image d'accroche…");
        const fd = new FormData();
        fd.append("file", coverPhoto);
        const res = await fetch(`${apiBase}/api/storage/upload`, { method: "POST", body: fd });
        if (res.ok) {
          const { objectPath } = await res.json() as { objectPath: string };
          previewUrl = `/api${objectPath}`;
        }
      }

      setProgress("Création du produit…");
      const categorySlug = SELLER_CATEGORY_SLUG[category];
      let categoryId: number | null = null;
      const catRes = await fetch(`${apiBase}/api/categories`);
      if (catRes.ok) {
        const cats = await catRes.json() as Array<{ id: number; slug: string }>;
        categoryId = cats.find(c => c.slug === categorySlug)?.id ?? null;
      }

      const catLabel = SELLER_CATEGORIES.find(c => c.value === category)?.label ?? category;
      const effectiveSubject = (category === "academique" ? (subjectManual.trim() || subject) : subject.trim()) || catLabel;
      const effectiveLevel = category === "academique" ? (level || "general") : config.levelValue;
      const createRes = await fetch(`${apiBase}/api/documents/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || catLabel,
          subject: effectiveSubject,
          level: effectiveLevel,
          semester: (category === "academique" && semester) ? semester : undefined,
          docType: docType || undefined,
          price: isFree ? 0 : Number(price),
          isFeatured: false,
          categoryId,
          previewUrl,
          sellerId: seller.id,
        }),
      });
      if (!createRes.ok) throw new Error("Erreur lors de la création");
      const doc = await createRes.json() as { id: number };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Envoi du fichier ${i + 1}/${files.length} : ${file.name}…`);
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch(`${apiBase}/api/storage/upload`, { method: "POST", body: fd });
        if (!upRes.ok) continue;
        const { objectPath, fileSize } = await upRes.json() as { objectPath: string; fileSize: number };
        await fetch(`${apiBase}/api/documents/${doc.id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath, fileName: file.name, fileSize: fileSize ?? file.size, sortOrder: i }),
        });
      }

      toast({ title: "Produit publié avec succès !" });
      setTitle(""); setDescription(""); setSubject(""); setSubjectManual(""); setDocType("");
      setLevel(""); setSemester(""); setPrice(""); setIsFree(false);
      setFiles([]); setCoverPhoto(null); setCoverPreview(null);
      onSuccess();
    } catch {
      toast({ title: "Une erreur s'est produite. Réessayez.", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Étape 1 — Type de contenu */}
      <div>
        <p className="text-sm font-semibold mb-3">1. Type de contenu <span className="text-destructive">*</span></p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SELLER_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const selected = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryChange(cat.value)}
                className={`border-2 rounded-xl p-3 text-left transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="text-xl block mb-1">{cat.emoji}</span>
                <CatIcon className={`w-0 h-0 hidden`} />
                <span className={`text-xs font-bold block leading-tight ${selected ? "text-primary" : ""}`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Étape 2 — Champs spécifiques à la catégorie */}
      <div className="space-y-3">
        {category === "academique" ? (
          <>
            {/* Niveau scolaire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Niveau scolaire <span className="text-destructive">*</span></label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choisir un niveau…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(levelsByGroup).map(([group, ls]) => (
                      <div key={group}>
                        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</p>
                        {ls.map((l) => <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>)}
                      </div>
                    ))}
                    {levelOptions.length === 0 && (
                      <SelectItem value="_none" disabled>Aucun niveau disponible</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Semestre <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <Select value={semester} onValueChange={(v) => setSemester(v === "__none" ? "" : v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Aucun —</SelectItem>
                    {SEMESTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matière */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Matière <span className="text-destructive">*</span></label>
              <div className="flex gap-2">
                <Select value={subject} onValueChange={(v) => { setSubject(v); setSubjectManual(""); }}>
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Choisir dans la liste" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    {subjectOptions.length === 0 && <SelectItem value="_none" disabled>Aucune matière</SelectItem>}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou saisir manuellement…"
                  value={subjectManual}
                  onChange={(e) => { setSubjectManual(e.target.value); setSubject(""); }}
                  className="h-10 flex-1"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">{config.subjectLabel}</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={config.subjectPlaceholder}
              className="h-10"
            />
          </div>
        )}

        {config.docTypes && config.docTypes.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Type de document <span className="text-muted-foreground font-normal">(optionnel)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {config.docTypes.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDocType(docType === dt.value ? "" : dt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    docType === dt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {dt.emoji} {dt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Étape 3 — Infos du produit */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Titre du produit <span className="text-destructive">*</span></label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Soyez précis et descriptif pour attirer les acheteurs"
            className="h-10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Description <span className="text-muted-foreground font-normal">(fortement recommandé)</span></label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez ce que contient votre produit, à qui il s'adresse, ce qu'il apporte…"
            rows={3}
            className="resize-none"
          />
        </div>
        {/* Accès : Free / Premium */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Accès au produit <span className="text-destructive">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setIsFree(true); setPrice("0"); }}
              className={`border-2 rounded-xl p-3 text-left transition-all ${
                isFree ? "border-green-500 bg-green-50" : "border-border hover:border-green-300"
              }`}
            >
              <span className="text-xl block mb-1">🆓</span>
              <span className={`text-sm font-bold block ${isFree ? "text-green-700" : "text-foreground"}`}>Gratuit</span>
              <span className="text-xs text-muted-foreground block mt-0.5">Téléchargement libre</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsFree(false); setPrice(""); }}
              className={`border-2 rounded-xl p-3 text-left transition-all ${
                !isFree ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-xl block mb-1">💎</span>
              <span className={`text-sm font-bold block ${!isFree ? "text-primary" : "text-foreground"}`}>Premium</span>
              <span className="text-xs text-muted-foreground block mt-0.5">Produit payant</span>
            </button>
          </div>
        </div>

        {/* Prix — affiché seulement si Premium */}
        {!isFree && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Prix de vente (FCFA) <span className="text-destructive">*</span></label>
            <div className="relative">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500"
                min={100}
                step={100}
                className="h-10 pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">FCFA</span>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 100 FCFA — vous recevrez une commission sur chaque vente</p>
          </div>
        )}
      </div>

      {/* Étape 4 — Image d'accroche */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Image d'accroche <span className="text-muted-foreground font-normal">(optionnel)</span></label>
        <p className="text-xs text-muted-foreground">Une belle image augmente significativement les ventes</p>
        {coverPreview ? (
          <div className="relative inline-block">
            <img src={coverPreview} alt="Aperçu" className="rounded-xl border border-border object-cover h-40 w-auto max-w-full" />
            <button
              type="button"
              className="absolute top-2 right-2 bg-white/90 border border-border rounded-full p-1 hover:bg-destructive hover:text-white transition-colors"
              onClick={() => { setCoverPhoto(null); setCoverPreview(null); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer text-center"
            onClick={() => !submitting && coverRef.current?.click()}
          >
            <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Cliquez pour ajouter une image</p>
            <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP — Taille recommandée : 800×600px</p>
          </div>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { setCoverPhoto(file); setCoverPreview(URL.createObjectURL(file)); }
            e.target.value = "";
          }}
        />
      </div>

      {/* Étape 5 — Fichiers du produit */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Fichier(s) du produit <span className="text-muted-foreground font-normal">(vous pouvez en ajouter après publication)</span></label>
        <div
          className="border-2 border-dashed border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => !submitting && fileRef.current?.click()}
        >
          {files.length === 0 ? (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Cliquez pour choisir vos fichiers</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{config.fileHint}</p>
            </div>
          ) : (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{f.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeFile(i)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" className="w-full text-center text-xs text-primary hover:underline py-1" onClick={() => fileRef.current?.click()}>
                + Ajouter d'autres fichiers
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={config.fileAccept}
          multiple
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
            e.target.value = "";
          }}
        />
      </div>

      {progress && (
        <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          {progress}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
        <Send className="w-4 h-4" />
        {submitting ? "Publication en cours…" : "Publier ce produit"}
      </Button>
    </form>
  );
}

function EditProductModal({
  product,
  apiBase,
  onClose,
  onSaved,
}: {
  product: SellerProduct;
  apiBase: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(String(product.price));
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(product.previewUrl ?? null);
  const [saving, setSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Le titre est obligatoire", variant: "destructive" }); return; }
    if (!price || isNaN(Number(price)) || Number(price) < 100) {
      toast({ title: "Prix invalide (minimum 100 FCFA)", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      let newPreviewUrl: string | undefined;
      if (coverPhoto) {
        const fd = new FormData();
        fd.append("file", coverPhoto);
        const res = await fetch(`${apiBase}/api/storage/upload`, { method: "POST", body: fd });
        if (res.ok) {
          const { objectPath } = await res.json() as { objectPath: string };
          newPreviewUrl = `/api${objectPath}`;
        }
      }
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price),
      };
      if (newPreviewUrl !== undefined) body.previewUrl = newPreviewUrl;
      else if (coverPreview === null && product.previewUrl) body.previewUrl = null;

      const res = await fetch(`${apiBase}/api/documents/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Produit mis à jour !" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Une erreur s'est produite. Réessayez.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg">Modifier le produit</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo d'accroche */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Photo d'accroche</label>
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Couverture" className="w-full h-40 object-cover rounded-xl border border-border" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    className="bg-white/90 border border-border rounded-full p-1.5 hover:bg-primary hover:text-white transition-colors"
                    onClick={() => coverRef.current?.click()}
                    title="Changer la photo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="bg-white/90 border border-border rounded-full p-1.5 hover:bg-destructive hover:text-white transition-colors"
                    onClick={() => { setCoverPhoto(null); setCoverPreview(null); }}
                    title="Supprimer la photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer text-center"
                onClick={() => coverRef.current?.click()}
              >
                <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Cliquez pour ajouter une photo</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG, WEBP — 800×600px recommandé</p>
              </div>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setCoverPhoto(file); setCoverPreview(URL.createObjectURL(file)); }
              e.target.value = "";
            }} />
          </div>

          {/* Titre */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Titre <span className="text-destructive">*</span></label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="resize-none" />
          </div>

          {/* Prix */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Prix (FCFA) <span className="text-destructive">*</span></label>
            <div className="relative">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={100} step={100} className="h-10 pr-16" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">FCFA</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [stats, setStats] = useState<SellerStats>({ productCount: 0, salesCount: 0, revenue: 0, totalViews: 0 });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prodRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/api/seller/products`, { credentials: "include" }),
        fetch(`${apiBase}/api/seller/stats`, { credentials: "include" }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoadingProducts(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetch(`${apiBase}/api/seller/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) { navigate("/seller/login"); return; }
        const data: SellerInfo = await res.json();
        setSeller(data);
        loadProducts();
      })
      .catch(() => navigate("/seller/login"))
      .finally(() => setLoading(false));
  }, [apiBase, navigate, loadProducts]);

  const handleLogout = async () => {
    await fetch(`${apiBase}/api/seller/auth/logout`, { method: "POST", credentials: "include" });
    toast({ title: "Déconnexion réussie" });
    navigate("/seller/login");
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    const res = await fetch(`${apiBase}/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Produit supprimé" });
      loadProducts();
    } else {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const productInfo = PRODUCT_TYPE_LABELS[seller.productType] ?? { label: seller.productType, icon: Package, color: "text-gray-600 bg-gray-50" };
  const ProductIcon = productInfo.icon;
  const memberSince = new Date(seller.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview",  label: "Vue d'ensemble",    icon: TrendingUp },
    { key: "submit",    label: "Publier un produit", icon: Plus },
    { key: "products",  label: "Mes produits",       icon: Package },
    { key: "profile",   label: "Mon profil",         icon: User },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ fontFamily: "var(--app-font-serif)" }}>E-SERVICES</span>
            <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">Espace Vendeur</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">{seller.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* Tab nav */}
      <div className="bg-card border-b border-card-border sticky top-[61px] z-20">
        <div className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSubmitSuccess(false); if (t.key === "products" || t.key === "overview") loadProducts(); }}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 flex-shrink-0 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className={t.key === "submit" ? "" : "hidden sm:inline"}>{t.label}</span>
              {t.key === "submit" && <span className="sm:hidden">Publier</span>}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* VUE D'ENSEMBLE */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Banner de bienvenue */}
            <div className="bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-primary-foreground/70 text-sm mb-1">Bienvenue,</p>
                  <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{seller.name}</h1>
                  <p className="text-primary-foreground/70 text-sm">Vendeur depuis le {memberSince}</p>
                  <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
                    <ProductIcon className="w-3.5 h-3.5" />
                    {productInfo.label}
                  </div>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ProductIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            {/* Stats réelles */}
            <div>
              <h2 className="font-bold text-lg mb-3">Statistiques</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard emoji="💰" value={stats.revenue.toLocaleString("fr-FR")} label="Revenus totaux" sub="en FCFA" />
                <StatCard emoji="📦" value={stats.salesCount} label="Ventes réalisées" sub="commandes validées" />
                <StatCard emoji="🗂️" value={stats.productCount} label="Produits publiés" sub="en ligne sur E-SERVICES" />
                <StatCard emoji="👁️" value={stats.totalViews} label="Téléchargements" sub="depuis la création" />
              </div>
            </div>

            {/* Par où commencer */}
            <div className="bg-card border border-card-border rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-primary" /> Par où commencer ?
              </h2>
              <div className="space-y-3">
                {[
                  {
                    icon: CheckCircle, color: "text-green-600 bg-green-50",
                    title: "Compte approuvé",
                    desc: "Votre candidature a été acceptée. Félicitations !",
                    done: true,
                  },
                  {
                    icon: Upload, color: "text-primary bg-primary/10",
                    title: stats.productCount > 0 ? `${stats.productCount} produit${stats.productCount > 1 ? "s" : ""} publié${stats.productCount > 1 ? "s" : ""}` : "Publiez votre premier produit",
                    desc: stats.productCount > 0
                      ? "Vos produits sont visibles sur le catalogue E-SERVICES."
                      : "Cliquez sur « Publier un produit » pour mettre votre contenu en vente immédiatement.",
                    done: stats.productCount > 0,
                    action: stats.productCount === 0 ? () => setTab("submit") : undefined,
                    actionLabel: "Publier maintenant",
                  },
                  {
                    icon: ShoppingBag, color: "text-purple-600 bg-purple-50",
                    title: stats.salesCount > 0 ? `${stats.salesCount} vente${stats.salesCount > 1 ? "s" : ""} réalisée${stats.salesCount > 1 ? "s" : ""}` : "Vos premières ventes",
                    desc: stats.salesCount > 0
                      ? `Revenus générés : ${stats.revenue.toLocaleString("fr-FR")} FCFA`
                      : "Les clients peuvent acheter vos produits et vous recevez une commission à chaque vente.",
                    done: stats.salesCount > 0,
                  },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      {s.action && (
                        <button onClick={s.action} className="text-xs text-primary hover:underline mt-1 font-medium">
                          {s.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission info */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" /> Comment fonctionne la commission ?
              </h3>
              <div className="space-y-2 text-sm text-amber-800">
                <p>• À chaque vente de votre produit, vous recevez une commission sur le prix de vente.</p>
                <p>• Les paiements sont effectués chaque semaine par Wave, Orange Money ou Free Money.</p>
                <p>• Vous pouvez voir le détail de vos ventes dans l'onglet "Mes produits".</p>
              </div>
            </div>
          </div>
        )}

        {/* PUBLIER UN PRODUIT */}
        {tab === "submit" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                Publier un produit
              </h1>
              <p className="text-muted-foreground text-sm">
                Remplissez le formulaire ci-dessous. Votre produit sera immédiatement visible sur le catalogue E-SERVICES.
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Produit publié avec succès !</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Votre produit est maintenant visible sur le catalogue E-SERVICES et disponible à l'achat.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={() => { setSubmitSuccess(false); loadProducts(); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Publier un autre produit
                  </Button>
                  <Button variant="outline" onClick={() => { setTab("products"); loadProducts(); }}>Voir mes produits</Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-card-border rounded-2xl p-6">
                <SubmitProductForm
                  seller={seller}
                  apiBase={apiBase}
                  onSuccess={() => { setSubmitSuccess(true); loadProducts(); }}
                />
              </div>
            )}
          </div>
        )}

        {/* MES PRODUITS */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Mes produits</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {products.length > 0
                    ? `${products.length} produit${products.length > 1 ? "s" : ""} en ligne`
                    : "Aucun produit publié pour l'instant"}
                </p>
              </div>
              <Button onClick={() => setTab("submit")} className="gap-2">
                <Plus className="w-4 h-4" /> Publier un produit
              </Button>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats.productCount}</p>
                  <p className="text-xs text-green-600">Publiés en ligne</p>
                </div>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{stats.salesCount}</p>
                  <p className="text-xs text-muted-foreground">Ventes validées</p>
                </div>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
                <Eye className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{stats.revenue.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-muted-foreground">FCFA générés</p>
                </div>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                <h3 className="font-bold text-lg mb-2">Aucun produit pour l'instant</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Vous n'avez pas encore publié de produit. Cliquez sur le bouton ci-dessous pour commencer.
                </p>
                <Button onClick={() => setTab("submit")} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" /> Publier mon premier produit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p) => {
                  const catMatch = SELLER_CATEGORIES.find(c =>
                    p.categoryName?.toLowerCase().includes(c.label.toLowerCase().split(" ")[0])
                  );
                  const CatIcon = catMatch?.icon ?? Package;
                  const catInfo = PRODUCT_TYPE_LABELS[p.categoryName?.toLowerCase() ?? ""] ?? { color: "text-primary bg-primary/10" };
                  return (
                    <div key={p.id} className="bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col">
                      {/* Cover image or category icon */}
                      {p.previewUrl ? (
                        <div className="h-36 overflow-hidden">
                          <img src={p.previewUrl} alt={p.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`h-36 flex items-center justify-center ${catInfo.color}`}>
                          <CatIcon className="w-14 h-14 opacity-40" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.title}</h3>
                            {p.categoryName && (
                              <span className="text-xs text-muted-foreground mt-0.5 block">{p.categoryName}</span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary flex-shrink-0 ml-2 whitespace-nowrap">
                            {p.price.toLocaleString("fr-FR")} FCFA
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-auto flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" /> En ligne
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {p.downloadCount}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                          <Link href={`/documents/${p.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                              <ExternalLink className="w-3.5 h-3.5" /> Voir
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                            title="Modifier"
                            onClick={() => setEditingProduct(p)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                            title="Supprimer"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MON PROFIL */}
        {tab === "profile" && (
          <div className="max-w-xl space-y-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Mon profil</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Vos informations de compte vendeur</p>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${productInfo.color}`}>
                  <ProductIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="font-bold text-xl">{seller.name}</h2>
                  <p className="text-sm text-muted-foreground">Membre depuis le {memberSince}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {[
                  { icon: User, label: "Nom complet", value: seller.name },
                  { icon: Mail, label: "Adresse email", value: seller.email },
                  { icon: Phone, label: "Téléphone", value: seller.phone },
                  { icon: ProductIcon, label: "Catégorie de produits", value: productInfo.label },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <row.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-medium truncate">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" /> Besoin de modifier vos informations ?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Pour modifier votre nom, email, téléphone ou catégorie de produits, contactez notre équipe directement.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span>📧</span>
                  <a href="mailto:support@xamxam.sn" className="text-primary hover:underline">support@xamxam.sn</a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>📱</span>
                  <span className="text-muted-foreground">WhatsApp : +221 77 577 14 43</span>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={handleLogout} className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </Button>
          </div>
        )}

      </main>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          apiBase={apiBase}
          onClose={() => setEditingProduct(null)}
          onSaved={() => { loadProducts(); }}
        />
      )}
    </div>
  );
}
