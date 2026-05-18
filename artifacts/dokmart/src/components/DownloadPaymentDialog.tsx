import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const schema = z.object({
  customerName:  z.string().min(2, "Nom requis (2 caractères minimum)"),
  customerEmail: z.string().email("Email invalide"),
  customerPhone: z.string().min(9, "Numéro de téléphone requis"),
});
type FormData = z.infer<typeof schema>;

type Provider = "WAVE" | "ORANGE_MONEY";

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; activeBorder: string; border: string }[] = [
  { id: "WAVE", label: "Wave", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", activeBorder: "border-blue-500 ring-2 ring-blue-200" },
  { id: "ORANGE_MONEY", label: "Orange Money", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", activeBorder: "border-orange-500 ring-2 ring-orange-200" },
];

interface PaymentReady {
  orderId: number;
  checkoutUrl: string;
  email: string;
  total: number;
  provider: Provider;
}

function RedirectingScreen({ pr, onClose }: { pr: PaymentReady; onClose: () => void }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const iv = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(iv); window.location.href = pr.checkoutUrl; return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [pr.checkoutUrl]);

  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <p className="font-bold text-lg">Commande créée !</p>
        <p className="text-muted-foreground text-sm mt-1">
          Montant : <span className="font-semibold text-foreground">{pr.total.toLocaleString("fr-FR")} FCFA</span>
        </p>
      </div>
      <div className="bg-muted rounded-xl p-4 w-full text-sm text-muted-foreground">
        <p>Redirection vers {pr.provider === "WAVE" ? "Wave" : "Orange Money"} dans…</p>
        <p className="text-3xl font-bold text-primary mt-1">{count}</p>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => { window.location.href = pr.checkoutUrl; }}>
        Payer maintenant
      </Button>
      <p className="text-xs text-muted-foreground">
        Après le paiement, un email de confirmation avec le lien de téléchargement vous sera envoyé à <strong>{pr.email}</strong>.
      </p>
    </div>
  );
}

interface DownloadPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
  downloadPrice: number;
}

export default function DownloadPaymentDialog({
  open,
  onClose,
  documentId,
  documentTitle,
  downloadPrice,
}: DownloadPaymentDialogProps) {
  const [provider, setProvider] = useState<Provider>("WAVE");
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState<PaymentReady | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: "", customerEmail: "", customerPhone: "" },
  });

  const handleClose = () => {
    if (loading) return;
    setPaymentReady(null);
    form.reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/payments/initiate-download`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ documentId, provider, ...data }),
      });
      const json = await res.json() as { orderId?: number; checkoutUrl?: string; totalAmount?: number; error?: string };
      if (!res.ok || !json.checkoutUrl) {
        toast({ variant: "destructive", title: "Erreur de paiement", description: json.error ?? "Veuillez réessayer." });
        return;
      }
      setPaymentReady({ orderId: json.orderId!, checkoutUrl: json.checkoutUrl, email: data.customerEmail, total: json.totalAmount!, provider });
    } catch {
      toast({ variant: "destructive", title: "Erreur réseau", description: "Impossible de joindre le serveur. Vérifiez votre connexion." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Télécharger le document
          </DialogTitle>
        </DialogHeader>

        {paymentReady ? (
          <RedirectingScreen pr={paymentReady} onClose={handleClose} />
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Document</p>
              <p className="font-semibold text-sm leading-tight">{documentTitle}</p>
              <p className="text-primary font-bold text-lg mt-1">{downloadPrice.toLocaleString("fr-FR")} FCFA</p>
            </div>

            {/* Provider */}
            <div>
              <p className="text-sm font-medium mb-2">Mode de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`rounded-xl border-2 p-3 text-sm font-semibold transition-all ${p.bg} ${p.color} ${provider === p.id ? p.activeBorder : p.border}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="customerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl><Input placeholder="Votre nom" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="votre@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone {provider === "WAVE" ? "Wave" : "Orange Money"}</FormLabel>
                    <FormControl><Input type="tel" placeholder="7X XXX XX XX" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <p className="text-xs text-muted-foreground">
                  Le lien de téléchargement sera envoyé par email après confirmation du paiement.
                </p>

                <Button type="submit" className="w-full gap-2" disabled={loading} size="lg">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {loading ? "Traitement…" : `Payer ${downloadPrice.toLocaleString("fr-FR")} FCFA`}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
