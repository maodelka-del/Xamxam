import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store, ArrowLeft, ArrowRight, BadgeCheck, Globe, TrendingUp, Users,
  BookOpen, FileText, Layers, Music, Code2, Image, Video, CheckCircle2,
  Phone, Mail, User, AlignLeft, Link2, ChevronDown, Lock, Eye, EyeOff,
} from "lucide-react";
import { useCreateSellerApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PRODUCT_TYPES = [
  { value: "documents",   label: "Documents éducatifs",   icon: BookOpen,  desc: "Annales, fiches, exercices corrigés" },
  { value: "ebooks",      label: "Ebooks & Livres",        icon: FileText,  desc: "Romans, guides, manuels PDF" },
  { value: "templates",   label: "Templates & CV",          icon: Layers,    desc: "Présentations, contrats, CV" },
  { value: "musique",     label: "Musique & Audio",         icon: Music,     desc: "Beats, instrumentales, sons" },
  { value: "logiciels",   label: "Logiciels & Scripts",     icon: Code2,     desc: "Apps, scripts, plugins" },
  { value: "graphismes",  label: "Photos & Graphismes",     icon: Image,     desc: "Logos, illustrations, designs" },
  { value: "formations",  label: "Vidéos & Formations",     icon: Video,     desc: "Cours en ligne, tutoriels" },
  { value: "themes",      label: "Sites Web & Thèmes",      icon: Globe,     desc: "Thèmes, landing pages, UI kits" },
];

const ADVANTAGES = [
  { icon: Store,      title: "Boutique gratuite",       desc: "Créez votre boutique en ligne sans frais d'installation" },
  { icon: Globe,      title: "15 000+ clients",         desc: "Accédez immédiatement à notre base d'acheteurs actifs" },
  { icon: TrendingUp, title: "Revenus passifs",          desc: "Vos produits se vendent 24h/24, même quand vous dormez" },
  { icon: Users,      title: "Support vendeur dédié",   desc: "Notre équipe vous accompagne à chaque étape" },
];

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide").regex(/^[0-9+\s()-]+$/, "Numéro invalide"),
  productType: z.string().optional().default(""),
  description: z.string().min(50, "Décrivez votre activité en au moins 50 caractères").max(1000),
  portfolioUrl: z.string().url("URL invalide (ex: https://...)").optional().or(z.literal("")),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function BecomeSeller() {
  const [submitted, setSubmitted] = useState(false);
  const submit = useCreateSellerApplication();

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      productType: "",
      description: "",
      portfolioUrl: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    submit.mutate(
      {
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          productType: values.productType || "general",
          description: values.description,
          portfolioUrl: values.portfolioUrl || null,
          password: values.password,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: () =>
          form.setError("root", { message: "Une erreur est survenue. Réessayez." }),
      }
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-card border border-card-border rounded-3xl p-10 text-center shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
            Candidature envoyée !
          </h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Merci pour votre intérêt ! Notre équipe va examiner votre dossier et vous contactera par email dans un délai de <strong>24–48 heures</strong>.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-semibold text-foreground">Prochaines étapes :</p>
            <div className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Vérification de votre dossier par notre équipe</span></div>
            <div className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Email de confirmation avec vos identifiants vendeur</span></div>
            <div className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Accès à votre tableau de bord et mise en ligne de vos produits</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
              </Button>
            </Link>
            <Link href="/catalog" className="flex-1">
              <Button className="w-full gap-2">
                Explorer le catalogue <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedType = PRODUCT_TYPES.find((t) => t.value === form.watch("productType"));

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
            </span>
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white/90 text-xs font-bold px-4 py-2 rounded-full mb-5 backdrop-blur-sm">
              <Store className="w-3.5 h-3.5" />
              Programme Vendeur E-SERVICES
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--app-font-serif)" }}>
              Vendez vos produits numériques au Sénégal
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Rejoignez plus de 100 créateurs sénégalais qui génèrent des revenus passifs sur E-SERVICES. Inscription gratuite, paiement Wave & Orange Money.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left — Advantages */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--app-font-serif)" }}>
                Pourquoi rejoindre E-SERVICES ?
              </h2>
              <div className="space-y-4">
                {ADVANTAGES.map((a) => (
                  <div key={a.title} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <a.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-3">Types de produits acceptés</h3>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPES.map((pt) => (
                  <div key={pt.value} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <pt.icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{pt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-5">
              <p className="text-sm font-semibold mb-1">Questions ?</p>
              <p className="text-xs text-muted-foreground mb-3">Notre équipe vendeur répond en moins de 2h</p>
              <a href="https://wa.me/221775771443" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Phone className="w-4 h-4" /> Contacter sur WhatsApp
                </Button>
              </a>
            </div>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                Formulaire de candidature
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Remplissez ce formulaire et notre équipe vous contactera sous 24–48h.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Name */}
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nom complet *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Aminata Diallo" {...field} data-testid="input-seller-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="votre@email.com" {...field} data-testid="input-seller-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Téléphone *</FormLabel>
                        <FormControl>
                          <Input placeholder="+221 77 000 00 00" {...field} data-testid="input-seller-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Product type */}
                  <FormField control={form.control} name="productType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><ChevronDown className="w-3.5 h-3.5" /> Type de produit principal <span className="text-muted-foreground font-normal">(optionnel)</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-seller-product-type">
                            <SelectValue placeholder="Tous types de produits numériques" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_TYPES.map((pt) => (
                            <SelectItem key={pt.value} value={pt.value}>
                              <span className="flex items-center gap-2">
                                <pt.icon className="w-4 h-4" />
                                {pt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedType && (
                        <p className="text-xs text-muted-foreground">{selectedType.desc}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Description */}
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> Décrivez votre activité *</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={4}
                          placeholder="Parlez-nous de vos produits, de votre expérience, pourquoi vous souhaitez vendre sur E-SERVICES..."
                          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          data-testid="textarea-seller-description"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">{field.value.length}/1000</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Portfolio URL */}
                  <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Portfolio / Exemples de travaux <span className="text-muted-foreground font-normal">(optionnel)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="https://votre-portfolio.com ou lien Drive" {...field} data-testid="input-seller-portfolio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Séparateur */}
                  <div className="border-t border-border pt-2">
                    <p className="text-sm font-semibold mb-1">Mot de passe de votre compte vendeur</p>
                    <p className="text-xs text-muted-foreground mb-4">Ce mot de passe sera utilisé pour vous connecter une fois votre candidature approuvée.</p>
                  </div>

                  {/* Password */}
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Mot de passe *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPass ? "text" : "password"}
                            placeholder="Au moins 8 caractères"
                            {...field}
                            data-testid="input-seller-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPass((v) => !v)}
                          >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Confirm Password */}
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Confirmer le mot de passe *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Répétez votre mot de passe"
                            {...field}
                            data-testid="input-seller-confirm-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirm((v) => !v)}
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {form.formState.errors.root && (
                    <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full gap-2"
                      disabled={submit.isPending}
                      data-testid="button-submit-seller-application"
                    >
                      {submit.isPending ? "Envoi en cours..." : (
                        <><Store className="w-4 h-4" /> Envoyer ma candidature</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      En soumettant ce formulaire, vous acceptez nos conditions d'utilisation. Réponse sous 24–48h.
                    </p>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
