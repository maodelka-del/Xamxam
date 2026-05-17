import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ShoppingCart, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  customerName:  z.string().min(2, "Nom requis (2 caractères minimum)"),
  customerEmail: z.string().email("Email invalide"),
  customerPhone: z.string().min(9, "Téléphone requis"),
});

type FormData = z.infer<typeof schema>;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Provider = "WAVE" | "ORANGE_MONEY";

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; border: string; activeBorder: string }[] = [
  {
    id:           "WAVE",
    label:        "Wave",
    color:        "text-blue-700",
    bg:           "bg-blue-50",
    border:       "border-blue-200",
    activeBorder: "border-blue-500 ring-2 ring-blue-200",
  },
  {
    id:           "ORANGE_MONEY",
    label:        "Orange Money",
    color:        "text-orange-700",
    bg:           "bg-orange-50",
    border:       "border-orange-200",
    activeBorder: "border-orange-500 ring-2 ring-orange-200",
  },
];

interface PaymentReady {
  orderId:     number;
  checkoutUrl: string;
  email:       string;
  total:       number;
  provider:    Provider;
}

// ── Countdown + auto-redirect screen ─────────────────────────────────────────
function RedirectingScreen({ pr }: { pr: PaymentReady }) {
  const [count, setCount] = useState(3);
  const fmt = (p: number) => p.toLocaleString("fr-FR") + " FCFA";

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.href = pr.checkoutUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pr.checkoutUrl]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-4">

        {/* Ordre créée */}
        <div className="bg-card border border-card-border rounded-2xl p-6 text-center space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>
            Commande créée !
          </h1>
          <div className="bg-primary/5 border border-primary/20 rounded-xl py-3 px-4">
            <p className="text-xs text-muted-foreground mb-0.5">Votre numéro de commande</p>
            <p className="text-3xl font-black text-primary tracking-wide">#{pr.orderId}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pr.email}</p>
          </div>
          <div className="bg-muted/60 rounded-xl py-3 px-4">
            <p className="text-sm text-muted-foreground">
              Notez ce numéro pour retrouver vos documents après le paiement.
            </p>
          </div>
        </div>

        {/* Redirection automatique */}
        <div className="bg-card border border-card-border rounded-2xl p-5 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-sm font-semibold">
            Redirection vers le paiement dans <span className="text-primary text-lg font-black">{count}</span>s…
          </p>
          <p className="text-xs text-muted-foreground">
            {pr.provider === "WAVE" ? "🌊 Wave" : "🟠 Orange Money"} — {fmt(pr.total)}
          </p>
          <button
            onClick={() => { window.location.href = pr.checkoutUrl; }}
            className="text-xs text-primary underline underline-offset-2"
          >
            Cliquer ici si la redirection ne se fait pas automatiquement
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { toast }                   = useToast();
  const [loading, setLoading]       = useState(false);
  const [provider, setProvider]     = useState<Provider>("WAVE");
  const [paymentReady, setPaymentReady] = useState<PaymentReady | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: "", customerEmail: "", customerPhone: "" },
  });

  const fmt = (p: number) => p.toLocaleString("fr-FR") + " FCFA";

  const onSubmit = async (data: FormData) => {
    if (!items.length) {
      toast({ title: "Panier vide", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/payments/initiate`.replace("//", "/"), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:  data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          provider,
          items: items.map((i) => ({ documentId: i.id })),
        }),
      });

      const result = await res.json() as { orderId?: number; checkoutUrl?: string; chargeId?: string; error?: string };

      if (!res.ok || !result.checkoutUrl || !result.orderId) {
        toast({ title: result.error ?? "Erreur lors de l'initialisation du paiement", variant: "destructive" });
        return;
      }

      try {
        const saved = JSON.parse(localStorage.getItem("xamxam_orders") ?? "[]");
        saved.unshift({ id: result.orderId, email: data.customerEmail, name: data.customerName, createdAt: new Date().toISOString() });
        localStorage.setItem("xamxam_orders", JSON.stringify(saved.slice(0, 10)));
      } catch { /* ignore */ }

      clearCart();
      setPaymentReady({
        orderId:     result.orderId,
        checkoutUrl: result.checkoutUrl,
        email:       data.customerEmail,
        total,
        provider,
      });
    } catch {
      toast({ title: "Erreur réseau. Veuillez réessayer.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Countdown + redirect screen ────────────────────────────────────────────
  if (paymentReady) {
    return <RedirectingScreen pr={paymentReady} />;
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">Votre panier est vide</h2>
          <Link href="/catalog"><Button>Voir le catalogue</Button></Link>
        </div>
      </div>
    );
  }

  // ── Checkout form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour au panier
        </Link>

        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
          Commander
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid md:grid-cols-3 gap-5">

              <div className="md:col-span-2 space-y-4">

                <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
                  <h2 className="font-semibold">Vos informations</h2>

                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nom complet</FormLabel>
                      <FormControl><Input placeholder="Moussa Diallo" className="h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="customerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl><Input type="email" placeholder="moussa@gmail.com" className="h-11" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Vos documents seront envoyés à cet email</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Téléphone</FormLabel>
                      <FormControl><Input placeholder="+221 77 000 00 00" className="h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
                  <h2 className="font-semibold">Moyen de paiement</h2>

                  <div className="grid grid-cols-2 gap-3">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all cursor-pointer ${
                          provider === p.id
                            ? `${p.activeBorder} ${p.bg}`
                            : `${p.border} bg-background hover:${p.bg}`
                        }`}
                      >
                        <span className="text-2xl">{p.id === "WAVE" ? "🌊" : "🟠"}</span>
                        <span className={`font-semibold text-sm ${provider === p.id ? p.color : "text-foreground"}`}>
                          {p.label}
                        </span>
                        {provider === p.id && (
                          <span className="ml-auto">
                            <svg className={`w-4 h-4 ${p.color}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">
                      Vous serez redirigé vers <strong>DiamanoPay</strong> pour finaliser votre paiement{" "}
                      {provider === "WAVE" ? "Wave" : "Orange Money"} en toute sécurité.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Paiement 100% sécurisé — vos données ne transitent pas par nos serveurs
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 h-13 text-base" disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Création de la commande…</>
                    : <><CreditCard className="w-4 h-4" /> Payer {fmt(total)} via {provider === "WAVE" ? "Wave" : "Orange Money"} →</>}
                </Button>
              </div>

              <div>
                <div className="bg-card border border-card-border rounded-2xl p-5 sticky top-24">
                  <h2 className="font-semibold mb-3">Résumé ({items.length})</h2>
                  <div className="space-y-2.5 mb-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground line-clamp-2 flex-1">{item.title}</span>
                        <span className="font-semibold flex-shrink-0">{fmt(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{fmt(total)}</span>
                  </div>
                </div>
              </div>

            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
