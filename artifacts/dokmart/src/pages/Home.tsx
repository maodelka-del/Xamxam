import { Link } from "wouter";
import {
  ArrowRight, BookOpen, ShieldCheck, Download, Users, TrendingUp, GraduationCap,
  School, Trophy, Building2, Star, Quote, Clock, Music, Image, Code2,
  FileText, Layers, Video, Store, Rocket, Globe, BadgeCheck, HeartHandshake,
  ChevronRight, Send,
} from "lucide-react";
import { useListFeaturedDocuments, useListCategories, useListLevels } from "@workspace/api-client-react";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const CYCLE_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; icon: React.ElementType; order: number }> = {
  "Primaire":   { color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: BookOpen,      order: 1 },
  "Collège":    { color: "from-blue-500 to-blue-600",       bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    icon: School,         order: 2 },
  "Lycée":      { color: "from-violet-500 to-violet-600",   bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  icon: GraduationCap,  order: 3 },
  "Supérieur":  { color: "from-orange-500 to-orange-600",   bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  icon: Building2,      order: 4 },
  "Concours":   { color: "from-rose-500 to-rose-600",       bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    icon: Trophy,         order: 5 },
};
const DEFAULT_CYCLE = { color: "from-gray-500 to-gray-600", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: BookOpen, order: 99 };

const CATEGORY_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  "documents-educatifs": { icon: BookOpen, color: "from-primary to-primary/80" },
  "ebooks-livres":       { icon: FileText, color: "from-blue-500 to-blue-600" },
  "templates":           { icon: Layers,   color: "from-violet-500 to-violet-600" },
  "musique-audio":       { icon: Music,    color: "from-pink-500 to-rose-500" },
  "logiciels-scripts":   { icon: Code2,    color: "from-emerald-500 to-green-600" },
  "photos-graphismes":   { icon: Image,    color: "from-orange-500 to-amber-500" },
  "formations":          { icon: Video,    color: "from-teal-500 to-cyan-600" },
  "themes":              { icon: Globe,    color: "from-indigo-500 to-blue-600" },
};
const DEFAULT_CAT_STYLE = { icon: BookOpen, color: "from-gray-500 to-gray-600" };

const TESTIMONIALS = [
  { name: "Fatou Diallo",    level: "Terminale S2 — Lycée Lamine Guèye", avatar: "FD", color: "bg-emerald-500", stars: 5, text: "Grâce aux annales de maths E-SERVICES, j'ai eu 16/20 au BAC. Les corrigés sont clairs et bien expliqués. Je recommande à tous mes camarades !" },
  { name: "Moussa Sow",      level: "Licence L2 Économie — UCAD",        avatar: "MS", color: "bg-blue-500",    stars: 5, text: "J'ai trouvé tous les examens de ma fac avec les corrigés. Les prix sont très abordables et le paiement Wave est rapide. Super service !" },
  { name: "Aminata Ndiaye",  level: "3ème — Dakar",                      avatar: "AN", color: "bg-violet-500",  stars: 5, text: "Mon fils a utilisé E-SERVICES pour préparer le BFEM. Il a eu une mention Bien ! Les fiches de révision sont vraiment très bien faites." },
  { name: "Ibrahima Fall",   level: "Concours ENA",                      avatar: "IF", color: "bg-rose-500",    stars: 5, text: "Les annales des concours de la fonction publique sont introuvables ailleurs. E-SERVICES m'a vraiment aidé à décrocher mon poste. Merci !" },
  { name: "Aissatou Bâ",    level: "BTS Comptabilité — Thiès",          avatar: "AB", color: "bg-orange-500",  stars: 5, text: "Excellent catalogue ! J'ai commandé 5 documents d'un coup, tout était disponible immédiatement après validation. Service sérieux." },
  { name: "Omar Dieng",      level: "CM2 — Saint-Louis",                 avatar: "OD", color: "bg-teal-500",    stars: 5, text: "Mon enfant prépare le CFEE avec les exercices E-SERVICES. Les sujets sont conformes au programme officiel sénégalais. Très satisfait." },
];

const WHY_US = [
  { icon: BadgeCheck,    title: "100% Sénégalais",      desc: "Tous les produits sont créés par des Sénégalais pour les Sénégalais. Contenu adapté au contexte local." },
  { icon: ShieldCheck,   title: "Paiement sécurisé",    desc: "Wave, Orange Money et Free Money. Chaque paiement vérifié manuellement pour votre sécurité." },
  { icon: Download,      title: "Téléchargement rapide",desc: "Accès immédiat à vos achats après validation. Téléchargez quand vous voulez, où vous voulez." },
  { icon: HeartHandshake,title: "Support dédié",        desc: "Notre équipe répond sur WhatsApp 7j/7. Satisfaction garantie ou remboursement." },
];


function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-1">
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
        ))}
      </div>
      <div className="relative">
        <Quote className="w-6 h-6 text-primary/15 absolute -top-1 -left-1" />
        <p className="text-sm text-foreground/80 leading-relaxed pl-4">{t.text}</p>
      </div>
      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border">
        <div className={`w-9 h-9 rounded-full ${t.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.level}</p>
        </div>
      </div>
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <section className="bg-gradient-to-r from-primary/5 to-secondary/10 border-y border-border py-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <Send className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>
          Restez informé des nouvelles publications
        </h2>
        <p className="text-muted-foreground mb-6">Recevez chaque semaine les nouveaux produits, offres exclusives et conseils de réussite.</p>
        {sent ? (
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <BadgeCheck className="w-5 h-5" /> Merci ! Vous êtes inscrit.
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) setSent(true); }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button type="submit" className="gap-2 shrink-0">
              S'inscrire <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: featured, isLoading: loadingFeatured } = useListFeaturedDocuments();
  const { data: categories, isLoading: loadingCats } = useListCategories();
  const { data: levels, isLoading: loadingLevels } = useListLevels();

  const stats = [
    { icon: Store,       value: "1 000+",   label: "Produits numériques" },
    { icon: Users,       value: "15 000+",  label: "Clients satisfaits" },
    { icon: Download,    value: "50 000+",  label: "Téléchargements" },
    { icon: TrendingUp,  value: "100+",     label: "Vendeurs partenaires" },
  ];

  const steps = [
    { step: "01", title: "Parcourez",     desc: "Explorez notre catalogue de milliers de produits numériques sénégalais.",   icon: BookOpen },
    { step: "02", title: "Choisissez",    desc: "Ajoutez vos produits au panier et choisissez votre méthode de paiement.",    icon: Store },
    { step: "03", title: "Payez",         desc: "Envoyez le montant via Wave, Orange Money ou Free Money et uploadez la preuve.", icon: Clock },
    { step: "04", title: "Téléchargez",   desc: "Accès immédiat à vos produits après validation. Téléchargez à vie.",         icon: Download },
  ];

  const heroLevels = (levels ?? []).slice(0, 8);

  const cycleGroups = (levels ?? []).reduce<Record<string, typeof levels>>((acc, lv) => {
    const g = lv.group ?? "Autres";
    if (!acc[g]) acc[g] = [];
    acc[g]!.push(lv);
    return acc;
  }, {});
  const sortedCycles = Object.entries(cycleGroups).sort(([a], [b]) => {
    const oa = CYCLE_CONFIG[a]?.order ?? 99;
    const ob = CYCLE_CONFIG[b]?.order ?? 99;
    return oa - ob;
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 opacity-15 bg-gradient-to-tr from-secondary/40 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white/90 text-xs font-bold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <Rocket className="w-3.5 h-3.5" />
              La Marketplace Numérique #1 du Sénégal
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Achetez et vendez{" "}
              <span className="text-secondary">des produits numériques</span>{" "}
              100% sénégalais
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-2xl">
              Documents éducatifs, ebooks, templates, musique, logiciels, formations — tout ce dont vous avez besoin, créé par des talents sénégalais.
            </p>
            {heroLevels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {loadingLevels
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full animate-pulse w-16 h-7 inline-block" />
                    ))
                  : heroLevels.map((lv) => (
                      <Link key={lv.id} href={`/catalog?level=${encodeURIComponent(lv.slug)}`}>
                        <span className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-white/10">
                          {lv.name}
                        </span>
                      </Link>
                    ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/catalog">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold gap-2 shadow-lg" data-testid="button-explore-catalog">
                  Explorer le catalogue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/seller/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 gap-2 font-semibold">
                  Devenir vendeur
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 mt-10 text-sm text-white/70">
              <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-secondary" /> Paiement Wave & Orange Money</span>
              <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-secondary" /> Téléchargement immédiat</span>
              <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-secondary" /> Satisfaction garantie</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <div className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>{s.value}</div>
                <div className="text-sm opacity-50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Types */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Tout en un seul endroit</p>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Types de produits numériques</h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">De l'éducation à la créativité, E-SERVICES couvre tous les besoins numériques des Sénégalais.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {loadingCats
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            : (categories ?? []).map((cat) => {
                const style = CATEGORY_STYLE[cat.slug] ?? DEFAULT_CAT_STYLE;
                const CatIcon = style.icon as React.ElementType;
                return (
                  <Link key={cat.id} href={`/catalog?category=${cat.slug}`}>
                    <div className="group relative overflow-hidden bg-card border border-card-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer h-full" data-testid={`card-category-${cat.id}`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                        <CatIcon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-sm leading-tight mb-1">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{cat.description ?? ""}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 absolute bottom-4 right-4 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
        </div>
      </section>


      {/* Levels / Cycles */}
      {(loadingLevels || sortedCycles.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Par cycle scolaire</p>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Niveaux scolaires</h2>
            </div>
            <Link href="/levels" className="text-sm text-primary hover:underline flex items-center gap-1">
              Voir tous <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingLevels
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
              : sortedCycles.map(([groupName, groupLevels]) => {
                  const cfg = CYCLE_CONFIG[groupName] ?? DEFAULT_CYCLE;
                  const CycleIcon = cfg.icon;
                  const totalDocs = groupLevels!.reduce((s, l) => s + l.documentCount, 0);
                  return (
                    <Link key={groupName} href="/levels">
                      <div className={`group relative overflow-hidden rounded-2xl border ${cfg.border} bg-white hover:shadow-lg transition-all duration-200 cursor-pointer`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${cfg.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                        <div className="p-5 flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-sm`}>
                            <CycleIcon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg leading-tight">{groupName}</h3>
                            <p className={`text-xs font-medium mt-0.5 ${cfg.text}`}>{groupLevels!.length} niveau{groupLevels!.length > 1 ? "x" : ""}</p>
                            <p className="text-xs text-muted-foreground mt-1">{totalDocs} document{totalDocs !== 1 ? "s" : ""} disponibles</p>
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                            {groupLevels!.slice(0, 3).map((lv) => (
                              <span key={lv.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} whitespace-nowrap`}>{lv.name}</span>
                            ))}
                            {groupLevels!.length > 3 && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>+{groupLevels!.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>
      )}

      {/* Featured Documents */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Les plus populaires</p>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Produits vedettes</h2>
            </div>
            <Link href="/catalog" className="text-sm text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingFeatured
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
              : (featured ?? []).map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
          <div className="text-center mt-10">
            <Link href="/catalog">
              <Button size="lg" variant="outline" className="gap-2">
                Voir tous les produits <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why E-SERVICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Pourquoi nous choisir</p>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>La différence E-SERVICES</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY_US.map((w) => (
            <div key={w.title} className="text-center p-6 bg-card border border-card-border rounded-2xl hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <w.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{w.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Simple et rapide</p>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Comment ça marche</h2>
            <p className="text-muted-foreground mt-3">En moins de 5 minutes, accédez à votre produit numérique.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border z-0" />
                )}
                <div className="relative bg-card border border-card-border rounded-xl p-6 z-10 text-center hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-sm mb-4 mx-auto shadow-md">
                    {s.step}
                  </div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/catalog">
              <Button size="lg" className="gap-2">
                Commencer maintenant <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Avis vérifiés</p>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Ce que disent nos clients</h2>
          <p className="text-muted-foreground mt-3">Plus de 15 000 Sénégalais font confiance à E-SERVICES chaque année.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => <TestimonialCard key={t.name} t={t} />)}
        </div>
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-6 h-6 fill-secondary text-secondary" />)}
          <span className="font-bold ml-2">4.9/5</span>
          <span className="text-muted-foreground ml-1">sur 2 400+ avis</span>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Become a Seller */}
      <section id="vendeur" className="py-20 bg-gradient-to-br from-foreground to-foreground/90 text-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-secondary font-bold text-sm uppercase tracking-wider mb-3">Opportunité unique</p>
              <h2 className="text-4xl font-bold mb-5" style={{ fontFamily: "var(--app-font-serif)" }}>
                Vendez vos produits numériques sur E-SERVICES
              </h2>
              <p className="text-background/70 mb-8 text-lg leading-relaxed">
                Vous créez des documents, des ebooks, des designs ou des formations ? Rejoignez notre réseau de vendeurs et atteignez des milliers de clients au Sénégal et en Afrique de l'Ouest.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  "Inscription gratuite — aucun frais mensuel",
                  "Commission compétitive sur chaque vente",
                  "Paiement rapide via Wave ou Orange Money",
                  "Tableau de bord pour suivre vos ventes",
                  "Support dédié pour les vendeurs",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5 text-secondary-foreground" />
                    </div>
                    <span className="text-background/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/seller/login">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold gap-2">
                  Devenir vendeur <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Store,      label: "Boutique en ligne",  desc: "Votre vitrine personnelle sur E-SERVICES" },
                { icon: Globe,      label: "Portée nationale",   desc: "Vendez à tout le Sénégal et la diaspora" },
                { icon: TrendingUp, label: "Revenus passifs",    desc: "Vos produits vendus 24h/24, 7j/7" },
                { icon: Users,      label: "Communauté",        desc: "Rejoignez 100+ créateurs partenaires" },
              ].map((card) => (
                <div key={card.label} className="bg-background/5 border border-background/10 rounded-2xl p-5 hover:bg-background/10 transition-colors">
                  <card.icon className="w-8 h-8 text-secondary mb-3" />
                  <h4 className="font-bold text-sm mb-1">{card.label}</h4>
                  <p className="text-xs text-background/50 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-secondary to-secondary/80 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ShieldCheck className="w-12 h-12 text-secondary-foreground/80 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-secondary-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
            Paiement 100% sécurisé, satisfaction garantie
          </h2>
          <p className="text-secondary-foreground/80 mb-8 text-lg">
            Wave, Orange Money, Free Money — payez comme vous préférez. Vérification manuelle par notre équipe pour votre tranquillité.
          </p>
          <Link href="/catalog">
            <Button size="lg" className="bg-primary text-white hover:bg-primary/90 font-bold gap-2 shadow-lg">
              Explorer le catalogue <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/70 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-bold text-xl text-background" style={{ fontFamily: "var(--app-font-serif)" }}>E-SERVICES</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">La Marketplace Numérique #1 du Sénégal. Achetez et vendez tous types de produits numériques.</p>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-secondary text-secondary" />)}
                <span className="text-xs ml-1 text-background/40">15 000+ clients</span>
              </div>
              <div className="flex gap-3">
                <a href="https://wa.me/221775771443" target="_blank" rel="noopener noreferrer"
                   className="w-8 h-8 bg-background/10 hover:bg-secondary hover:text-secondary-foreground rounded-lg flex items-center justify-center transition-colors text-xs font-bold">
                  W
                </a>
                <a href="#" className="w-8 h-8 bg-background/10 hover:bg-secondary hover:text-secondary-foreground rounded-lg flex items-center justify-center transition-colors text-xs font-bold">
                  f
                </a>
                <a href="#" className="w-8 h-8 bg-background/10 hover:bg-secondary hover:text-secondary-foreground rounded-lg flex items-center justify-center transition-colors text-xs font-bold">
                  in
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-background font-semibold text-sm mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/" className="hover:text-background transition-colors">Accueil</Link></li>
                <li><Link href="/catalog" className="hover:text-background transition-colors">Catalogue</Link></li>
                <li><Link href="/levels" className="hover:text-background transition-colors">Niveaux scolaires</Link></li>
                <li><Link href="/order/0" className="hover:text-background transition-colors">Mes commandes</Link></li>
                <li><Link href="/cart" className="hover:text-background transition-colors">Mon panier</Link></li>
              </ul>
            </div>

            {/* Types de produits */}
            <div>
              <h4 className="text-background font-semibold text-sm mb-4">Produits numériques</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/catalog" className="hover:text-background transition-colors">Documents éducatifs</Link></li>
                <li><Link href="/catalog?category=ebooks" className="hover:text-background transition-colors">Ebooks & Livres</Link></li>
                <li><Link href="/catalog?category=templates" className="hover:text-background transition-colors">Templates & CV</Link></li>
                <li><Link href="/catalog?category=musique" className="hover:text-background transition-colors">Musique & Audio</Link></li>
                <li><Link href="/catalog?category=formations" className="hover:text-background transition-colors">Formations en ligne</Link></li>
                <li><Link href="/catalog?category=logiciels" className="hover:text-background transition-colors">Logiciels & Scripts</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-background font-semibold text-sm mb-4">Contact & Support</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="https://wa.me/221775771443" className="hover:text-background transition-colors">WhatsApp : +221 77 577 14 43</a></li>
                <li><a href="mailto:contact@xamxam.sn" className="hover:text-background transition-colors">contact@xamxam.sn</a></li>
                <li><a href="mailto:vendeurs@xamxam.sn" className="hover:text-background transition-colors">vendeurs@xamxam.sn</a></li>
                <li><span>Dakar, Sénégal</span></li>
                <li><a href="#" className="hover:text-background transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Conditions d'utilisation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/40">
            <span>© {new Date().getFullYear()} E-SERVICES — La Marketplace Numérique du Sénégal. Tous droits réservés.</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-secondary" /> Wave accepté</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-secondary" /> Orange Money</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-secondary" /> Free Money</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
