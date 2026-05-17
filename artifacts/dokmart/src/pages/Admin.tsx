import { useState, useRef } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BarChart3, Package, ShoppingBag, Clock, CheckCircle, Plus, Trash2, BookOpen,
  Tag, Upload, FileText, GraduationCap, X, Files, ChevronRight, Sparkles,
  AlertCircle, ArrowLeft, Music, Layers, Globe, Video, Code2, Image as ImageIcon,
  Pencil, Save
} from "lucide-react";
import {
  useGetAdminStats, useListAdminOrders, useListDocuments, useListCategories,
  useListLevels, useCreateDocument, useDeleteDocument, useUpdateDocument, useCreateCategory,
  useCreateLevel, useDeleteLevel, useDeleteCategory, useGetDocumentFiles,
  useDeleteDocumentFile, useListSellerApplications, useReviewSellerApplication,
  getGetAdminStatsQueryKey, getListAdminOrdersQueryKey,
  getListDocumentsQueryKey, getListCategoriesQueryKey, getListLevelsQueryKey,
  getGetDocumentFilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "maodok595@gmail.com";
const ADMIN_PASSWORD = "782662435";

/* ── Types de contenu ─────────────────────────────────────────────── */
const CONTENT_CATEGORIES = [
  { value: "academique",  label: "Académique",        emoji: "📚", icon: BookOpen,   desc: "Cours, TD, annales, examens scolaires" },
  { value: "musique",     label: "Musique & Audio",    emoji: "🎵", icon: Music,      desc: "MP3, albums, sons instrumentaux" },
  { value: "template",    label: "Template / CV",      emoji: "📋", icon: Layers,     desc: "Modèles Word, Excel, CV professionnels" },
  { value: "ebook",       label: "Ebook & Livre",      emoji: "📖", icon: FileText,   desc: "Livres numériques, guides, manuels" },
  { value: "logiciel",    label: "Logiciel / Script",  emoji: "💻", icon: Code2,      desc: "Applications, scripts, outils" },
  { value: "graphisme",   label: "Graphisme / Photo",  emoji: "🖼️", icon: ImageIcon,  desc: "Photos, illustrations, packs visuels" },
  { value: "formation",   label: "Formation Vidéo",    emoji: "🎬", icon: Video,      desc: "Cours vidéo, tutoriels, formations" },
  { value: "theme",       label: "Site Web / Thème",   emoji: "🌐", icon: Globe,      desc: "Thèmes WordPress, templates HTML" },
] as const;

type ContentCategory = (typeof CONTENT_CATEGORIES)[number]["value"];

/* ── Configuration des champs par type de contenu ─────────────────── */
const CONTENT_CONFIG: Record<ContentCategory, {
  subjectLabel: string;
  subjectPlaceholder: string;
  levelLabel: string;
  levelValue: string;
  extraLabel?: string;
  extraPlaceholder?: string;
  showAcademicFields: boolean;
  fileAccept: string;
  fileHint: string;
  docTypes?: { value: string; label: string; emoji: string }[];
}> = {
  academique: {
    subjectLabel: "Matière",
    subjectPlaceholder: "Ex : Mathématiques, Physique, Histoire…",
    levelLabel: "Niveau scolaire",
    levelValue: "",
    showAcademicFields: true,
    fileAccept: ".pdf,application/pdf",
    fileHint: "Fichiers PDF uniquement",
    docTypes: [
      { value: "cours",     label: "Cours",          emoji: "📖" },
      { value: "td",        label: "TD",             emoji: "✏️" },
      { value: "tp",        label: "TP",             emoji: "🔬" },
      { value: "examen",    label: "Examen",         emoji: "📝" },
      { value: "corrige",   label: "Corrigé",        emoji: "✅" },
      { value: "annales",   label: "Annales",        emoji: "📚" },
      { value: "fiche",     label: "Fiche",          emoji: "🗂️" },
      { value: "resume",    label: "Résumé",         emoji: "📄" },
      { value: "exercices", label: "Exercices",      emoji: "🧮" },
      { value: "qcm",       label: "QCM",            emoji: "☑️" },
      { value: "devoir",    label: "Devoir",         emoji: "🖊️" },
      { value: "memoire",   label: "Mémoire",        emoji: "🎓" },
    ],
  },
  musique: {
    subjectLabel: "Artiste / Auteur",
    subjectPlaceholder: "Ex : Youssou N'Dour, Artiste inconnu…",
    levelLabel: "Genre musical",
    levelValue: "musique",
    extraLabel: "Style / Ambiance",
    extraPlaceholder: "Ex : Acoustique, Urbain, Traditionnel, Afrobeat…",
    showAcademicFields: false,
    fileAccept: ".mp3,.wav,.flac,.aac,.ogg,audio/*,.zip,application/zip",
    fileHint: "Fichiers MP3, WAV, FLAC ou archive ZIP",
    docTypes: [
      { value: "single",     label: "Single",         emoji: "🎵" },
      { value: "album",      label: "Album",          emoji: "💿" },
      { value: "instrumental", label: "Instrumental", emoji: "🎹" },
      { value: "beat",       label: "Beat / Riddim",  emoji: "🥁" },
      { value: "podcast",    label: "Podcast",        emoji: "🎙️" },
      { value: "sonore",     label: "Pack Sonore",    emoji: "🔊" },
    ],
  },
  template: {
    subjectLabel: "Type de template",
    subjectPlaceholder: "Ex : CV professionnel, Facture, Présentation…",
    levelLabel: "Logiciel requis",
    levelValue: "template",
    extraLabel: "Langue",
    extraPlaceholder: "Ex : Français, Anglais, Bilingue…",
    showAcademicFields: false,
    fileAccept: ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.zip,application/pdf",
    fileHint: "PDF, Word (.docx), Excel (.xlsx), PowerPoint ou ZIP",
    docTypes: [
      { value: "cv",          label: "CV",             emoji: "🧑‍💼" },
      { value: "lettre",      label: "Lettre de motiv.", emoji: "✉️" },
      { value: "facture",     label: "Facture",        emoji: "🧾" },
      { value: "contrat",     label: "Contrat",        emoji: "📜" },
      { value: "rapport",     label: "Rapport",        emoji: "📊" },
      { value: "presentation", label: "Présentation",  emoji: "🖥️" },
      { value: "flyer",       label: "Flyer",          emoji: "📰" },
      { value: "agenda",      label: "Agenda/Planner", emoji: "📅" },
    ],
  },
  ebook: {
    subjectLabel: "Auteur",
    subjectPlaceholder: "Ex : Cheikh Hamidou Kane, Auteur E-SERVICES…",
    levelLabel: "Genre littéraire",
    levelValue: "ebook",
    extraLabel: "Nombre de pages",
    extraPlaceholder: "Ex : 150",
    showAcademicFields: false,
    fileAccept: ".pdf,.epub,.mobi,application/pdf",
    fileHint: "Fichiers PDF, ePub ou MOBI",
    docTypes: [
      { value: "roman",      label: "Roman",          emoji: "📗" },
      { value: "guide",      label: "Guide pratique", emoji: "🧭" },
      { value: "manuel",     label: "Manuel",         emoji: "📘" },
      { value: "biographie", label: "Biographie",     emoji: "👤" },
      { value: "nouvelles",  label: "Nouvelles",      emoji: "📕" },
      { value: "poesie",     label: "Poésie",         emoji: "🌸" },
      { value: "bd",         label: "BD / Comic",     emoji: "🎨" },
      { value: "magazine",   label: "Magazine",       emoji: "📰" },
    ],
  },
  logiciel: {
    subjectLabel: "Langage / Plateforme",
    subjectPlaceholder: "Ex : Python, JavaScript, Android, Windows…",
    levelLabel: "Type de logiciel",
    levelValue: "logiciel",
    extraLabel: "Version / Compatibilité",
    extraPlaceholder: "Ex : Windows 10+, Android 8+, PHP 8…",
    showAcademicFields: false,
    fileAccept: ".zip,.rar,.tar.gz,.exe,.apk,application/zip",
    fileHint: "Archive ZIP, RAR, ou fichier installable",
    docTypes: [
      { value: "application", label: "Application",   emoji: "📱" },
      { value: "script",      label: "Script",        emoji: "⚙️" },
      { value: "plugin",      label: "Plugin",        emoji: "🔌" },
      { value: "api",         label: "API / Module",  emoji: "🔗" },
      { value: "jeu",         label: "Jeu",           emoji: "🎮" },
      { value: "extension",   label: "Extension",     emoji: "🧩" },
    ],
  },
  graphisme: {
    subjectLabel: "Auteur / Studio",
    subjectPlaceholder: "Ex : E-SERVICES Design, Nom du graphiste…",
    levelLabel: "Format principal",
    levelValue: "graphisme",
    extraLabel: "Style visuel",
    extraPlaceholder: "Ex : Minimaliste, Africain, Moderne, Vintage…",
    showAcademicFields: false,
    fileAccept: ".jpg,.jpeg,.png,.svg,.psd,.ai,.zip,image/*",
    fileHint: "Images JPG, PNG, SVG ou archive ZIP",
    docTypes: [
      { value: "logo",       label: "Logo",           emoji: "✏️" },
      { value: "affiche",    label: "Affiche",        emoji: "🖼️" },
      { value: "icones",     label: "Pack d'icônes",  emoji: "🎯" },
      { value: "mockup",     label: "Mockup",         emoji: "📐" },
      { value: "fond",       label: "Fond d'écran",   emoji: "🌄" },
      { value: "photos",     label: "Pack Photos",    emoji: "📷" },
      { value: "ui_kit",     label: "UI Kit",         emoji: "🎨" },
    ],
  },
  formation: {
    subjectLabel: "Formateur / Créateur",
    subjectPlaceholder: "Ex : E-SERVICES Academy, Nom du formateur…",
    levelLabel: "Niveau requis",
    levelValue: "formation",
    extraLabel: "Durée estimée",
    extraPlaceholder: "Ex : 2h30, 5 modules, 10 vidéos…",
    showAcademicFields: false,
    fileAccept: ".mp4,.mov,.avi,.mkv,.zip,video/*",
    fileHint: "Vidéos MP4, MOV ou archive ZIP",
    docTypes: [
      { value: "debutant",  label: "Débutant",        emoji: "🌱" },
      { value: "intermediaire", label: "Intermédiaire", emoji: "📈" },
      { value: "avance",    label: "Avancé",          emoji: "🚀" },
      { value: "masterclass", label: "Masterclass",   emoji: "🎓" },
      { value: "atelier",   label: "Atelier pratique", emoji: "🔧" },
    ],
  },
  theme: {
    subjectLabel: "CMS / Technologie",
    subjectPlaceholder: "Ex : WordPress, HTML/CSS, React, Shopify…",
    levelLabel: "Type de site",
    levelValue: "theme",
    extraLabel: "Compatibilité",
    extraPlaceholder: "Ex : WordPress 6.0+, Bootstrap 5, PHP 8…",
    showAcademicFields: false,
    fileAccept: ".zip,.tar.gz,application/zip",
    fileHint: "Archive ZIP contenant le thème complet",
    docTypes: [
      { value: "blog",       label: "Blog",           emoji: "✍️" },
      { value: "portfolio",  label: "Portfolio",      emoji: "🗂️" },
      { value: "boutique",   label: "Boutique",       emoji: "🛒" },
      { value: "vitrine",    label: "Vitrine",        emoji: "🏪" },
      { value: "landing",    label: "Landing Page",   emoji: "🎯" },
      { value: "dashboard",  label: "Dashboard",      emoji: "📊" },
    ],
  },
};

const SEMESTERS = [
  { value: "s1", label: "Semestre 1 (S1)" },
  { value: "s2", label: "Semestre 2 (S2)" },
  { value: "annuel", label: "Annuel" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:          { label: "En attente",      className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  approved:         { label: "Approuvé",        className: "bg-green-100 text-green-800 border-green-200" },
  rejected:         { label: "Rejeté",          className: "bg-red-100 text-red-800 border-red-200" },
};

const docSchema = z.object({
  level: z.string().default("general"),
  semester: z.string().optional(),
  subject: z.string().min(2, "Ce champ est requis"),
  categoryId: z.string().optional(),
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  docType: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  downloadPrice: z.coerce.number().min(0).optional(),
  isFree: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  extraField: z.string().optional(),
});

const catSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
});

const levelSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  group: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});

/* ── DocFileManager ─────────────────────────────────────────────── */
function DocFileManager({ documentId, queryClient, toast }: { documentId: number; queryClient: any; toast: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const { data: files, isLoading } = useGetDocumentFiles(documentId, { query: { queryKey: getGetDocumentFilesQueryKey(documentId) } });
  const deleteFile = useDeleteDocumentFile();

  const handleAddFiles = async (selected: File[]) => {
    setUploading(true);
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      setProgress(`Envoi ${i + 1}/${selected.length} : ${file.name}...`);
      try {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/storage/upload", { method: "POST", body: form });
        if (!uploadRes.ok) continue;
        const { objectPath, fileSize } = await uploadRes.json() as { objectPath: string; fileSize: number };
        await fetch(`/api/documents/${documentId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath, fileName: file.name, fileSize: fileSize ?? file.size, sortOrder: (files?.length ?? 0) + i }),
        });
      } catch { /* skip */ }
    }
    setUploading(false);
    setProgress("");
    queryClient.invalidateQueries({ queryKey: getGetDocumentFilesQueryKey(documentId) });
  };

  const handleDelete = (fileId: number) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    deleteFile.mutate({ id: documentId, fileId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDocumentFilesQueryKey(documentId) }),
    });
  };

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fichiers du produit</p>
        <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Plus className="w-3 h-3" /> Ajouter
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length > 0) handleAddFiles(files); e.target.value = ""; }} />
      </div>
      {isLoading ? <p className="text-xs text-muted-foreground">Chargement...</p>
        : (files ?? []).length === 0 ? <p className="text-xs text-muted-foreground italic">Aucun fichier — cliquez sur Ajouter pour en uploader.</p>
        : (
          <div className="space-y-1">
            {(files ?? []).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs">
                <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate flex-1 font-medium">{f.fileName}</span>
                {f.fileSize && <span className="text-muted-foreground flex-shrink-0">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                <a href={`/api${f.objectPath}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-shrink-0">Voir</a>
                <button className="text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => handleDelete(f.id)}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      {progress && <p className="text-xs text-primary mt-1.5 animate-pulse">{progress}</p>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon className="w-5 h-5" /></div>
      <div className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ── Formulaire de création de produit ───────────────────────────── */
function AddDocumentForm({ onClose, onCreate, levels, categories }: {
  onClose: () => void;
  onCreate: (data: z.infer<typeof docSchema>, files: File[], contentCategory: ContentCategory, coverFile?: File | null) => Promise<void>;
  levels: any[];
  categories: any[];
}) {
  const [contentCategory, setContentCategory] = useState<ContentCategory>("academique");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [success, setSuccess] = useState<{ title: string } | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const config = CONTENT_CONFIG[contentCategory];

  const form = useForm<z.infer<typeof docSchema>>({
    resolver: zodResolver(docSchema),
    defaultValues: { level: "general", semester: "", subject: "", categoryId: "", title: "", docType: "", description: "", price: 500, isFree: false, isFeatured: false, extraField: "" },
  });

  const levelsByGroup = levels.reduce<Record<string, any[]>>((acc, l) => {
    const g = l.group ?? "Autres";
    if (!acc[g]) acc[g] = [];
    acc[g].push(l);
    return acc;
  }, {});

  const handleCategoryChange = (cat: ContentCategory) => {
    setContentCategory(cat);
    form.reset({ level: CONTENT_CONFIG[cat].levelValue || "general", semester: "", subject: "", categoryId: "", title: "", docType: "", description: "", price: 500, isFree: false, isFeatured: false, extraField: "" });
    setPendingFiles([]);
    setCoverPhoto(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (data: z.infer<typeof docSchema>) => {
    if (config.showAcademicFields && !data.level) {
      toast({ title: "Choisissez un niveau", variant: "destructive" });
      return;
    }
    if (!data.isFree && (!data.price || data.price < 100)) {
      toast({ title: "Le prix minimum est 100 FCFA pour un produit Premium", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await onCreate(data, pendingFiles, contentCategory, coverPhoto);
      setSuccess({ title: data.title });
      form.reset({ level: config.levelValue || "general", semester: "", subject: "", categoryId: "", title: "", docType: "", description: "", price: 500, isFree: false, isFeatured: false, extraField: "" });
      setPendingFiles([]);
      setCoverPhoto(null);
      setCoverPreview(null);
    } catch (err: unknown) {
      const e = err as any;
      const apiMsg: string = e?.data?.error ?? e?.message ?? "";
      const display = apiMsg ? (apiMsg.length <= 150 ? apiMsg : apiMsg.slice(0, 147) + "…") : "Erreur lors de la création";
      toast({ title: display, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>Produit publié !</h2>
        <p className="text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">"{success.title}"</span> a été ajouté au catalogue.
        </p>
        <div className="flex gap-3 mt-2">
          <Button onClick={() => setSuccess(null)} className="gap-2"><Plus className="w-4 h-4" /> Ajouter un autre produit</Button>
          <Button variant="outline" onClick={onClose}>Retour à la liste</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Ajouter un produit</h1>
            <p className="text-sm text-muted-foreground">Choisissez d'abord le type de contenu, puis remplissez les informations</p>
          </div>
        </div>

        {/* ÉTAPE 0 — Type de contenu */}
        <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
            <h2 className="font-semibold">Quel type de produit voulez-vous ajouter ?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONTENT_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const selected = contentCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`border-2 rounded-xl p-3 text-left transition-all ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-2xl block mb-1">{cat.emoji}</span>
                  <span className={`text-xs font-bold block ${selected ? "text-primary" : ""}`}>{cat.label}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5 leading-tight hidden sm:block">{cat.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

            {/* ÉTAPE 1 — Localisation (académique) ou champs spécifiques */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <h2 className="font-semibold">
                  {config.showAcademicFields ? "Localisation dans le programme" : "Informations de base"}
                </h2>
              </div>

              {config.showAcademicFields ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau scolaire <span className="text-destructive">*</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir un niveau" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(levelsByGroup).map(([group, ls]) => (
                            <div key={group}>
                              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</p>
                              {ls.map((l) => <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>)}
                            </div>
                          ))}
                          {levels.length === 0 && <SelectItem value="_none" disabled>Aucun niveau — créez-en d'abord</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="semester" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semestre</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none">— Aucun —</SelectItem>
                          {SEMESTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Matière <span className="text-destructive">*</span></FormLabel>
                      <div className="flex gap-2">
                        <Select value={field.value} onValueChange={(v) => {
                          field.onChange(v);
                          const matched = categories.find((c: any) => c.name === v);
                          if (matched) form.setValue("categoryId", String(matched.id));
                        }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Choisir dans la liste" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Ou saisir manuellement…"
                          value={field.value}
                          onChange={(e) => { field.onChange(e.target.value); form.setValue("categoryId", ""); }}
                          className="flex-1"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{config.subjectLabel} <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder={config.subjectPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {config.extraLabel && (
                    <FormField control={form.control} name="extraField" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{config.extraLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder={config.extraPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              )}
            </div>

            {/* ÉTAPE 2 — Informations du produit */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <h2 className="font-semibold">Informations du produit</h2>
              </div>

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        contentCategory === "musique" ? "Ex : Album Acoustique Vol.1 — 10 titres inédits" :
                        contentCategory === "template" ? "Ex : Pack CV Professionnel — 5 modèles Word" :
                        contentCategory === "ebook" ? "Ex : Guide complet du Marketing Digital 2024" :
                        contentCategory === "formation" ? "Ex : Formation Comptabilité de Base — 12 vidéos" :
                        "Ex : Annales Mathématiques 2023 — BAC S"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {config.docTypes && (
                <FormField control={form.control} name="docType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {contentCategory === "academique" ? "Type de document" :
                       contentCategory === "musique" ? "Type de contenu audio" :
                       contentCategory === "template" ? "Type de template" :
                       contentCategory === "ebook" ? "Genre littéraire" :
                       contentCategory === "logiciel" ? "Type de logiciel" :
                       contentCategory === "graphisme" ? "Type de visuel" :
                       contentCategory === "formation" ? "Niveau de la formation" :
                       "Type de thème"}
                    </FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {config.docTypes!.map((t) => (
                        <button
                          key={t.value} type="button"
                          className={`border-2 rounded-xl py-2.5 px-2 text-center transition-all cursor-pointer text-xs font-medium ${
                            field.value === t.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          }`}
                          onClick={() => field.onChange(field.value === t.value ? "" : t.value)}
                        >
                          <span className="block text-lg mb-1">{t.emoji}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground text-xs">(recommandé)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        contentCategory === "musique" ? "Décrivez le contenu musical, l'ambiance, les instruments utilisés…" :
                        contentCategory === "template" ? "Décrivez ce que contient ce template, comment l'utiliser…" :
                        contentCategory === "ebook" ? "Résumez le contenu de l'ebook, à qui il s'adresse…" :
                        "Décrivez le contenu, l'année scolaire, le niveau de difficulté…"
                      }
                      className="resize-none" rows={3} {...field}
                    />
                  </FormControl>
                </FormItem>
              )} />

              {/* Accès : Free / Premium */}
              <FormField control={form.control} name="isFree" render={({ field }) => (
                <FormItem>
                  <FormLabel>Accès au produit <span className="text-destructive">*</span></FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => { field.onChange(true); form.setValue("price", 0); }}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${
                        field.value ? "border-green-500 bg-green-50" : "border-border hover:border-green-300"
                      }`}
                    >
                      <span className="text-xl block mb-1">🆓</span>
                      <span className={`text-sm font-bold block ${field.value ? "text-green-700" : "text-foreground"}`}>Gratuit</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">Lecture sécurisée</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { field.onChange(false); form.setValue("price", 500); }}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${
                        !field.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl block mb-1">💎</span>
                      <span className={`text-sm font-bold block ${!field.value ? "text-primary" : "text-foreground"}`}>Premium</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">Produit payant</span>
                    </button>
                  </div>
                </FormItem>
              )} />

              {/* Prix — affiché seulement si Premium */}
              {!form.watch("isFree") && (
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (FCFA) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min={100} step={100} placeholder="500" className="pr-14" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">FCFA</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Prix de téléchargement — affiché seulement si Gratuit */}
              {form.watch("isFree") && (
                <FormField control={form.control} name="downloadPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix de téléchargement (FCFA) <span className="text-muted-foreground text-xs font-normal">(optionnel)</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min={0} step={100} placeholder="0 = gratuit aussi" className="pr-14" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">FCFA</span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Lecture toujours gratuite. Si renseigné, un bouton de téléchargement payant sera affiché.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="isFeatured" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mettre en avant ?</FormLabel>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? "bg-primary" : "bg-muted"}`}
                      onClick={() => field.onChange(!field.value)}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {field.value && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                      {field.value ? "Mis en avant" : "Normal"}
                    </span>
                  </div>
                </FormItem>
              )} />
            </div>

            {/* ÉTAPE 3b — Photo d'accroche */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <h2 className="font-semibold">Photo d'accroche <span className="text-muted-foreground text-xs font-normal">(optionnel)</span></h2>
              </div>
              {coverPreview ? (
                <div className="relative inline-block mb-2">
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
                  onClick={() => coverRef.current?.click()}
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Cliquez pour ajouter une image de couverture</p>
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

            {/* ÉTAPE 4 — Fichier(s) */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                <h2 className="font-semibold">Fichier(s) du produit</h2>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => multiFileRef.current?.click()}
              >
                {pendingFiles.length === 0 ? (
                  <div className="text-center py-2">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">Cliquez pour sélectionner vos fichiers</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{config.fileHint}</p>
                  </div>
                ) : (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-primary truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="w-full text-center text-xs text-primary hover:underline py-1" onClick={() => multiFileRef.current?.click()}>
                      + Ajouter d'autres fichiers
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={multiFileRef}
                type="file"
                accept={config.fileAccept}
                multiple
                className="hidden"
                onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]); e.target.value = ""; }}
              />

              {pendingFiles.length === 0 && (
                <div className="flex items-start gap-2 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Vous pouvez publier sans fichier et en ajouter plus tard depuis la liste des produits.</p>
                </div>
              )}

              {uploadProgress && <p className="text-xs text-primary mt-2 animate-pulse">{uploadProgress}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 gap-2" disabled={uploading}>
                <Upload className="w-4 h-4" />
                {uploading ? (uploadProgress || "Publication en cours…") : "Publier ce produit"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={uploading}>Annuler</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

/* ── Page principale Admin ───────────────────────────────────────── */
export default function Admin() {
  const [enteredEmail, setEnteredEmail] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem("xamxam_admin_auth") === "1");
  const [tab, setTab] = useState<"dashboard" | "orders" | "documents" | "categories" | "levels" | "sellers">("dashboard");
  const [sellerSubTab, setSellerSubTab] = useState<"accounts" | "applications">("accounts");
  const [activeSellers, setActiveSellers] = useState<Array<{ id: number; name: string; email: string; phone: string; productType: string; createdAt: string }>>([]);
  const [loadingActiveSellers, setLoadingActiveSellers] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

  type EditDoc = { id: number; title: string; price: number; downloadPrice: number; description: string; isFeatured: boolean };
  type EditCat = { id: number; name: string; slug: string };
  type EditLevel = { id: number; name: string; group: string; sortOrder: number };
  const [editDoc, setEditDoc] = useState<EditDoc | null>(null);
  const [editCat, setEditCat] = useState<EditCat | null>(null);
  const [editLevel, setEditLevel] = useState<EditLevel | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useGetAdminStats({ query: { enabled: isAuth, queryKey: getGetAdminStatsQueryKey() } });
  const { data: orders, isLoading: loadingOrders } = useListAdminOrders(
    { status: statusFilter || undefined, limit: 50 },
    { query: { enabled: isAuth, queryKey: getListAdminOrdersQueryKey({ status: statusFilter || undefined, limit: 50 }) } }
  );
  const { data: docs } = useListDocuments({ limit: 100 }, { query: { enabled: isAuth, queryKey: getListDocumentsQueryKey({ limit: 100 }) } });
  const { data: categories } = useListCategories({ query: { enabled: isAuth, queryKey: getListCategoriesQueryKey() } });
  const { data: levels } = useListLevels({ query: { enabled: isAuth, queryKey: getListLevelsQueryKey() } });
  const { data: sellerApps } = useListSellerApplications({}, { query: { enabled: isAuth, queryKey: ["listSellerApplications"] } });
  const reviewSeller = useReviewSellerApplication();

  const createDoc = useCreateDocument();
  const deleteDoc = useDeleteDocument();
  const updateDoc = useUpdateDocument();
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();
  const createLevel = useCreateLevel();
  const deleteLevel = useDeleteLevel();

  const catForm = useForm({ resolver: zodResolver(catSchema), defaultValues: { name: "", slug: "", description: "" } });
  const levelForm = useForm({ resolver: zodResolver(levelSchema), defaultValues: { name: "", slug: "", group: "", description: "", sortOrder: 0 } });

  const handleAuth = () => {
    if (enteredEmail.trim() === ADMIN_EMAIL && enteredPassword === ADMIN_PASSWORD) {
      localStorage.setItem("xamxam_admin_auth", "1");
      setIsAuth(true);
    } else {
      toast({ title: "Email ou mot de passe incorrect", variant: "destructive" });
    }
  };

  const handleLogout = () => { localStorage.removeItem("xamxam_admin_auth"); setIsAuth(false); };

  const uploadFilesToDocument = async (documentId: number, files: File[]): Promise<boolean> => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/storage/upload", { method: "POST", body: form });
        if (!uploadRes.ok) return false;
        const { objectPath, fileSize } = await uploadRes.json() as { objectPath: string; fileSize: number };
        const regRes = await fetch(`/api/documents/${documentId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath, fileName: file.name, fileSize: fileSize ?? file.size, sortOrder: i }),
        });
        if (!regRes.ok) return false;
      } catch { return false; }
    }
    return true;
  };

  const handleCreateDoc = async (data: z.infer<typeof docSchema>, files: File[], contentCategory: ContentCategory, coverFile?: File | null): Promise<void> => {
    const config = CONTENT_CONFIG[contentCategory];
    const levelValue = config.showAcademicFields ? data.level : (config.levelValue || "general");

    let previewUrl: string | undefined;
    if (coverFile) {
      try {
        const fd = new FormData();
        fd.append("file", coverFile);
        const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
        if (res.ok) {
          const { objectPath } = await res.json() as { objectPath: string };
          previewUrl = `/api${objectPath}`;
        }
      } catch { /* skip */ }
    }

    return new Promise((resolve, reject) => {
      createDoc.mutate(
        {
          data: {
            title: data.title,
            description: data.description || `${CONTENT_CATEGORIES.find(c => c.value === contentCategory)?.label ?? contentCategory}`,
            subject: data.extraField ? `${data.subject} — ${data.extraField}` : data.subject,
            level: levelValue,
            semester: data.semester || undefined,
            docType: data.docType || undefined,
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
            price: data.price,
            downloadPrice: data.isFree && data.downloadPrice ? data.downloadPrice : undefined,
            isFeatured: data.isFeatured ?? false,
            previewUrl,
          },
        },
        {
          onSuccess: async (doc) => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ limit: 100 }) });
            if (files.length > 0) await uploadFilesToDocument(doc.id, files);
            resolve();
          },
          onError: (err) => reject(err),
        }
      );
    });
  };

  const handleDeleteDoc = (id: number) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    deleteDoc.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ limit: 100 }) }) });
  };

  const handleUpdateDoc = () => {
    if (!editDoc) return;
    updateDoc.mutate(
      { id: editDoc.id, data: { title: editDoc.title, price: editDoc.price, downloadPrice: editDoc.downloadPrice || undefined, description: editDoc.description, isFeatured: editDoc.isFeatured } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ limit: 100 }) });
          setEditDoc(null);
          toast({ title: "Produit mis à jour" });
        },
        onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
      }
    );
  };

  const handleUpdateCat = async () => {
    if (!editCat) return;
    setSavingCat(true);
    try {
      await fetch(`/api/categories/${editCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCat.name, slug: editCat.slug }),
      });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setEditCat(null);
      toast({ title: "Catégorie mise à jour" });
    } catch {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    } finally {
      setSavingCat(false);
    }
  };

  const handleUpdateLevel = async () => {
    if (!editLevel) return;
    setSavingLevel(true);
    try {
      await fetch(`/api/levels/${editLevel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editLevel.name, group: editLevel.group, sortOrder: editLevel.sortOrder }),
      });
      queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() });
      setEditLevel(null);
      toast({ title: "Niveau mis à jour" });
    } catch {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    } finally {
      setSavingLevel(false);
    }
  };

  const handleCreateCat = (data: z.infer<typeof catSchema>) => {
    createCat.mutate({ data }, {
      onSuccess: () => {
        catForm.reset();
        setShowCatForm(false);
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Catégorie créée" });
      },
    });
  };

  const handleDeleteCat = (id: number) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    deleteCat.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }) });
  };

  const handleCreateLevel = (data: z.infer<typeof levelSchema>) => {
    createLevel.mutate({ data }, {
      onSuccess: () => {
        levelForm.reset();
        setShowLevelForm(false);
        queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() });
        toast({ title: "Niveau créé" });
      },
    });
  };

  const handleDeleteLevel = (id: number) => {
    if (!confirm("Supprimer ce niveau ?")) return;
    deleteLevel.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLevelsQueryKey() }) });
  };

  const handleReviewSeller = (id: number, status: "approved" | "rejected") => {
    reviewSeller.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: status === "approved" ? "Vendeur approuvé" : "Candidature rejetée" });
        queryClient.invalidateQueries();
        if (status === "approved") loadActiveSellers();
      },
    });
  };

  const loadActiveSellers = () => {
    setLoadingActiveSellers(true);
    fetch("/api/admin/sellers")
      .then(r => r.json())
      .then(data => setActiveSellers(Array.isArray(data) ? data : []))
      .catch(() => setActiveSellers([]))
      .finally(() => setLoadingActiveSellers(false));
  };

  const handleDeleteSeller = async (id: number, name: string) => {
    if (!confirm(`Supprimer le compte de "${name}" ? Cette action est irréversible. Ses produits resteront dans le catalogue mais ne seront plus liés à son compte.`)) return;
    const res = await fetch(`/api/admin/sellers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: `Compte de "${name}" supprimé` });
      loadActiveSellers();
      queryClient.invalidateQueries();
    } else {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const formatPrice = (p: number) => p.toLocaleString("fr-FR") + " FCFA";

  /* ── Login ─────────────────────────────────────────────────────── */
  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <div className="max-w-sm w-full bg-card border border-card-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Administration</h1>
            <p className="text-sm text-muted-foreground mt-1">Accès réservé à l'équipe E-SERVICES</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">Email administrateur</label>
              <Input type="email" value={enteredEmail} onChange={(e) => setEnteredEmail(e.target.value)} placeholder="admin@example.com" onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Mot de passe</label>
              <Input type="password" value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
            </div>
            <Button className="w-full" size="lg" onClick={handleAuth}>Se connecter</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Layout admin ──────────────────────────────────────────────── */
  if (showAddDocForm) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <AddDocumentForm
          onClose={() => setShowAddDocForm(false)}
          onCreate={handleCreateDoc}
          levels={levels ?? []}
          categories={categories ?? []}
        />
      </div>
    );
  }

  const NAV_ITEMS = [
    { key: "dashboard" as const,   label: "Dashboard",     icon: BarChart3 },
    { key: "orders" as const,      label: "Commandes",     icon: ShoppingBag },
    { key: "documents" as const,   label: "Produits",      icon: Package },
    { key: "categories" as const,  label: "Catégories",    icon: Tag },
    { key: "levels" as const,      label: "Niveaux",       icon: GraduationCap },
    { key: "sellers" as const,     label: "Vendeurs",      icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm hidden sm:block" style={{ fontFamily: "var(--app-font-serif)" }}>E-SERVICES Admin</span>
          </Link>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
          <X className="w-4 h-4" /> Déconnexion
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-card border-b border-card-border sticky top-[61px] z-20">
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setTab(item.key); if (item.key === "sellers") loadActiveSellers(); }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-sm font-medium border-b-2 flex-shrink-0 transition-colors ${
                tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Tableau de bord</h1>
            {loadingStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={Package} label="Produits" value={stats?.totalDocuments ?? 0} color="bg-blue-50 text-blue-600" />
                <StatCard icon={ShoppingBag} label="Commandes" value={stats?.totalOrders ?? 0} color="bg-purple-50 text-purple-600" />
                <StatCard icon={Clock} label="En attente" value={stats?.pendingPayments ?? 0} color="bg-amber-50 text-amber-600" />
                <StatCard icon={CheckCircle} label="Approuvées" value={stats?.approvedOrders ?? 0} color="bg-green-50 text-green-600" />
              </div>
            )}
          </div>
        )}

        {/* Commandes */}
        {tab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Commandes</h1>
              <select
                className="text-sm border border-border rounded-lg px-3 py-2 bg-card"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>

                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
              </select>
            </div>
            {loadingOrders ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : (orders?.orders ?? []).length === 0 ? (
              <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-semibold">Aucune commande</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(orders?.orders ?? []).map((order) => {
                  const badge = STATUS_BADGE[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground" };
                  return (
                    <div key={order.id} className="bg-card border border-card-border rounded-xl px-4 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">#{order.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badge.className}`}>{badge.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{order.customerName} — {order.customerEmail}</p>
                          <p className="text-sm font-semibold text-primary mt-0.5">{formatPrice(order.totalAmount)}</p>
                        </div>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            Voir <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Produits */}
        {tab === "documents" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Produits</h1>
              <Button onClick={() => setShowAddDocForm(true)} className="gap-2"><Plus className="w-4 h-4" /> Ajouter un produit</Button>
            </div>
            {(docs?.documents ?? []).length === 0 ? (
              <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="font-semibold mb-1">Aucun produit</h3>
                <p className="text-sm text-muted-foreground mb-4">Commencez par ajouter des produits au catalogue.</p>
                <Button onClick={() => setShowAddDocForm(true)} className="gap-2"><Plus className="w-4 h-4" /> Ajouter un produit</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {(docs?.documents ?? []).map((d) => (
                  <div key={d.id} className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`card-doc-admin-${d.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{d.title}</span>
                          {(d as any).docType && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium flex-shrink-0">{(d as any).docType}</span>
                          )}
                          {d.isFeatured && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {d.subject} {d.level && d.level !== "general" ? `— ${d.level}` : ""}
                          {" "}<span className="font-medium text-primary">{formatPrice(d.price)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1.5 text-xs h-8 px-2" onClick={() => setExpandedDocId(expandedDocId === d.id ? null : d.id)}>
                          <Files className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fichiers</span>
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Modifier"
                          onClick={() => setEditDoc(editDoc?.id === d.id ? null : { id: d.id, title: d.title, price: d.price, downloadPrice: (d as any).downloadPrice ?? 0, description: d.description ?? "", isFeatured: d.isFeatured })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteDoc(d.id)} data-testid={`button-delete-doc-${d.id}`} title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Formulaire d'édition inline */}
                    {editDoc?.id === d.id && (
                      <div className="border-t border-border bg-muted/40 px-4 py-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modifier le produit</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium block mb-1">Titre</label>
                            <Input value={editDoc.title} onChange={e => setEditDoc({ ...editDoc, title: e.target.value })} className="h-9 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1">Prix (FCFA)</label>
                            <Input type="number" min={0} step={100} value={editDoc.price} onChange={e => setEditDoc({ ...editDoc, price: Number(e.target.value) })} className="h-9 text-sm" />
                          </div>
                        </div>
                        {editDoc.price === 0 && (
                          <div>
                            <label className="text-xs font-medium block mb-1">Prix de téléchargement (FCFA) <span className="text-muted-foreground font-normal">— optionnel, pour doc gratuit</span></label>
                            <Input type="number" min={0} step={100} placeholder="0 = pas de téléchargement payant" value={editDoc.downloadPrice} onChange={e => setEditDoc({ ...editDoc, downloadPrice: Number(e.target.value) })} className="h-9 text-sm" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-medium block mb-1">Description</label>
                          <Textarea value={editDoc.description} onChange={e => setEditDoc({ ...editDoc, description: e.target.value })} className="resize-none text-sm" rows={2} />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium">Mis en avant (Populaire)</label>
                          <button
                            type="button"
                            onClick={() => setEditDoc({ ...editDoc, isFeatured: !editDoc.isFeatured })}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editDoc.isFeatured ? "bg-primary" : "bg-muted border border-border"}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editDoc.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          {editDoc.isFeatured && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="gap-1.5" onClick={handleUpdateDoc} disabled={updateDoc.isPending}>
                            <Save className="w-3.5 h-3.5" /> {updateDoc.isPending ? "Enregistrement…" : "Enregistrer"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditDoc(null)}>Annuler</Button>
                        </div>
                      </div>
                    )}

                    {expandedDocId === d.id && <DocFileManager documentId={d.id} queryClient={queryClient} toast={toast} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Catégories */}
        {tab === "categories" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Catégories</h1>
              <Button onClick={() => setShowCatForm(!showCatForm)} className="gap-2"><Plus className="w-4 h-4" /> Nouvelle catégorie</Button>
            </div>
            {showCatForm && (
              <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
                <h2 className="font-bold mb-4">Ajouter une catégorie</h2>
                <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(handleCreateCat)} className="space-y-4">
                    <FormField control={catForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Mathématiques" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={catForm.control} name="slug" render={({ field }) => (
                      <FormItem><FormLabel>Slug (URL)</FormLabel><FormControl><Input placeholder="mathematiques" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex gap-3">
                      <Button type="submit" disabled={createCat.isPending}>Enregistrer</Button>
                      <Button type="button" variant="outline" onClick={() => setShowCatForm(false)}>Annuler</Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(categories ?? []).map((c) => (
                <div key={c.id} className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`card-cat-admin-${c.id}`}>
                  {editCat?.id === c.id ? (
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Modifier la catégorie</p>
                      <div>
                        <label className="text-xs font-medium block mb-1">Nom</label>
                        <Input value={editCat.name} onChange={e => setEditCat({ ...editCat, name: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Slug (URL)</label>
                        <Input value={editCat.slug} onChange={e => setEditCat({ ...editCat, slug: e.target.value })} className="h-8 text-sm font-mono" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="gap-1.5 h-8" onClick={handleUpdateCat} disabled={savingCat}>
                          <Save className="w-3 h-3" /> {savingCat ? "…" : "Sauvegarder"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setEditCat(null)}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.slug} — {c.documentCount} produit{c.documentCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Modifier" onClick={() => setEditCat({ id: c.id, name: c.name, slug: c.slug })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCat(c.id)} data-testid={`button-delete-cat-${c.id}`} title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Niveaux */}
        {tab === "levels" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Niveaux scolaires</h1>
              <Button onClick={() => setShowLevelForm(!showLevelForm)} className="gap-2" data-testid="button-new-level"><Plus className="w-4 h-4" /> Nouveau niveau</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Exemples : CFEE, BFEM, BAC S1, L1, L2, Concours ENA…</p>

            {showLevelForm && (
              <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
                <h2 className="font-bold mb-4">Ajouter un niveau</h2>
                <Form {...levelForm}>
                  <form onSubmit={levelForm.handleSubmit(handleCreateLevel)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={levelForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nom du niveau</FormLabel><FormControl><Input placeholder="Ex: L1, BAC S, Concours ENA…" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={levelForm.control} name="slug" render={({ field }) => (
                      <FormItem><FormLabel>Slug (identifiant URL)</FormLabel><FormControl><Input placeholder="Ex: l1, bac-s, concours-ena…" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={levelForm.control} name="group" render={({ field }) => (
                      <FormItem><FormLabel>Cycle / Groupe</FormLabel><FormControl><Input placeholder="Ex: Supérieur, Lycée, Concours…" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={levelForm.control} name="sortOrder" render={({ field }) => (
                      <FormItem><FormLabel>Ordre d'affichage</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="sm:col-span-2 flex gap-3">
                      <Button type="submit" disabled={createLevel.isPending} data-testid="button-save-level">{createLevel.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
                      <Button type="button" variant="outline" onClick={() => setShowLevelForm(false)}>Annuler</Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {(levels ?? []).length === 0 ? (
              <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="font-semibold mb-1">Aucun niveau créé</h3>
                <p className="text-sm text-muted-foreground">Créez vos premiers niveaux pour les associer aux documents académiques.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(levels ?? []).map((l) => (
                  <div key={l.id} className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`card-level-admin-${l.id}`}>
                    {editLevel?.id === l.id ? (
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Modifier le niveau</p>
                        <div>
                          <label className="text-xs font-medium block mb-1">Nom</label>
                          <Input value={editLevel.name} onChange={e => setEditLevel({ ...editLevel, name: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Cycle / Groupe</label>
                          <Input value={editLevel.group} onChange={e => setEditLevel({ ...editLevel, group: e.target.value })} className="h-8 text-sm" placeholder="Ex: Lycée, Supérieur, Concours…" />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Ordre d'affichage</label>
                          <Input type="number" value={editLevel.sortOrder} onChange={e => setEditLevel({ ...editLevel, sortOrder: Number(e.target.value) })} className="h-8 text-sm" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="gap-1.5 h-8" onClick={handleUpdateLevel} disabled={savingLevel}>
                            <Save className="w-3 h-3" /> {savingLevel ? "…" : "Sauvegarder"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditLevel(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm">{l.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{l.group ? `${l.group} · ` : ""}{l.slug} — {l.documentCount} doc{l.documentCount !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Modifier" onClick={() => setEditLevel({ id: l.id, name: l.name, group: l.group ?? "", sortOrder: l.sortOrder ?? 0 })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteLevel(l.id)} data-testid={`button-delete-level-${l.id}`} title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vendeurs */}
        {tab === "sellers" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Vendeurs</h1>
              <span className="text-sm text-muted-foreground">{activeSellers.length} compte{activeSellers.length !== 1 ? "s" : ""} actif{activeSellers.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Sous-onglets */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-6 w-fit">
              <button
                onClick={() => setSellerSubTab("accounts")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${sellerSubTab === "accounts" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Comptes actifs
                {activeSellers.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeSellers.length}</span>
                )}
              </button>
              <button
                onClick={() => setSellerSubTab("applications")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${sellerSubTab === "applications" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Candidatures
                {(sellerApps?.applications ?? []).filter(a => a.status === "pending").length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {(sellerApps?.applications ?? []).filter(a => a.status === "pending").length}
                  </span>
                )}
              </button>
            </div>

            {/* COMPTES ACTIFS */}
            {sellerSubTab === "accounts" && (
              <>
                {loadingActiveSellers ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activeSellers.length === 0 ? (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <h3 className="font-semibold mb-1">Aucun vendeur actif</h3>
                    <p className="text-sm text-muted-foreground">Les vendeurs approuvés apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSellers.map((seller) => (
                      <div key={seller.id} className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{seller.name}</h3>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Actif
                            </span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize text-muted-foreground">
                              {seller.productType}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                            <span>{seller.email}</span>
                            <span>{seller.phone}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Membre depuis le {new Date(seller.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          title="Supprimer ce compte vendeur"
                          onClick={() => handleDeleteSeller(seller.id, seller.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* CANDIDATURES */}
            {sellerSubTab === "applications" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">Gérez les demandes d'inscription des vendeurs souhaitant publier sur E-SERVICES.</p>
                {(sellerApps?.applications ?? []).length === 0 ? (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <h3 className="font-semibold mb-1">Aucune candidature</h3>
                    <p className="text-sm text-muted-foreground">Les candidatures vendeurs apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(sellerApps?.applications ?? []).map((app) => (
                      <div key={app.id} className="bg-card border border-card-border rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold">{app.name}</h3>
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                app.status === "approved" ? "bg-green-100 text-green-700" :
                                app.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {app.status === "approved" ? "Approuvé" : app.status === "rejected" ? "Rejeté" : "En attente"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                              <span>{app.email}</span>
                              <span>{app.phone}</span>
                              <span className="capitalize font-medium text-foreground">{app.productType}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80 mb-2">{app.description}</p>
                            {app.portfolioUrl && (
                              <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                Portfolio →
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(app.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {app.status === "pending" && (
                            <div className="flex gap-2 sm:flex-col sm:items-stretch">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={() => handleReviewSeller(app.id, "approved")}>
                                <CheckCircle className="w-4 h-4" /> Approuver
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => handleReviewSeller(app.id, "rejected")}>
                                <AlertCircle className="w-4 h-4" /> Rejeter
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
