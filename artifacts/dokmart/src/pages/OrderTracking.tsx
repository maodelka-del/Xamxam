import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Clock, XCircle, Download, ArrowLeft, FileText, BookOpen, History, Loader2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useGetOrder, useGetDocumentFiles, getGetOrderQueryKey, getGetDocumentFilesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface SavedOrder { id: number; email: string; name: string; createdAt: string; }

function getSavedOrders(): SavedOrder[] {
  try { return JSON.parse(localStorage.getItem("xamxam_orders") ?? "[]"); } catch { return []; }
}

const emailSchema = z.object({ email: z.string().email("Email invalide") });

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function DocumentFileDownloads({ documentId, orderId, email }: { documentId: number | null; orderId: number; email: string }) {
  const { data: files } = useGetDocumentFiles(documentId ?? 0, {
    query: { enabled: !!documentId, queryKey: getGetDocumentFilesQueryKey(documentId ?? 0) },
  });
  if (!files || files.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {files.map((f) => {
        const viewUrl = `/order/${orderId}/view/${f.id}?email=${encodeURIComponent(email)}&name=${encodeURIComponent(f.fileName)}`;
        const downloadUrl = `${BASE}/api/orders/${orderId}/view-file/${f.id}?email=${encodeURIComponent(email)}&download=1`;
        return (
          <div key={f.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <FileText className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-xs font-medium text-green-800 truncate flex-1">{f.fileName}</span>
            {f.fileSize && <span className="text-xs text-green-600 flex-shrink-0">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
            <Link href={viewUrl}>
              <Button size="sm" variant="default" className="gap-1 text-xs h-7 px-2.5 flex-shrink-0">
                <BookOpen className="w-3 h-3" /> Lire
              </Button>
            </Link>
            <a href={downloadUrl} download={f.fileName}>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2 flex-shrink-0">
                <Download className="w-3 h-3" />
              </Button>
            </a>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_CONFIG = {
  pending:  { icon: Clock,       color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "En attente de paiement" },
  approved: { icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200",    label: "Paiement validé — Documents disponibles" },
  rejected: { icon: XCircle,     color: "text-red-600 bg-red-50 border-red-200",          label: "Paiement rejeté" },
};

export default function OrderTracking() {
  const [, params]   = useRoute("/order/:id");
  const searchStr    = useSearch();
  const urlParams    = new URLSearchParams(searchStr);
  const rawId        = parseInt(params?.id ?? "0", 10);
  const urlEmail     = urlParams.get("email") ?? "";
  const paymentStatus = urlParams.get("payment");

  const [email, setEmail]               = useState(urlEmail);
  const [confirmedEmail, setConfirmedEmail] = useState(urlEmail);
  const [savedOrders, setSavedOrders]   = useState<SavedOrder[]>([]);
  const [verifying, setVerifying]       = useState(false);

  const { toast }      = useToast();
  const emailForm      = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email } });

  useEffect(() => { setSavedOrders(getSavedOrders()); }, []);

  useEffect(() => {
    if (rawId && !confirmedEmail) {
      const saved = getSavedOrders().find((o) => o.id === rawId);
      if (saved) { setEmail(saved.email); setConfirmedEmail(saved.email); }
    }
  }, [rawId, confirmedEmail]);

  const isWaitingPayment = paymentStatus === "success";
  const enabled = !!rawId && rawId > 0 && !!confirmedEmail;

  // React Query polls automatically every 2s when waiting for payment confirmation
  const { data: order, isLoading, refetch } = useGetOrder(
    rawId,
    { email: confirmedEmail },
    {
      query: {
        enabled,
        queryKey: getGetOrderQueryKey(rawId, { email: confirmedEmail }),
        // Built-in polling: every 2s until approved, then stop
        refetchInterval: (query) => {
          if (!isWaitingPayment) return false;
          if ((query.state.data as any)?.status === "approved") return false;
          return 2000;
        },
        // Don't use stale cache when actively waiting for payment
        staleTime: isWaitingPayment ? 0 : 1000 * 30,
      },
    }
  );

  // Keep track of chargeId in a ref so the verify effect always sees the latest value
  const chargeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = (order as any)?.diamanopayChargeId;
    if (id) chargeIdRef.current = id;
  }, [order]);

  // When user arrives from payment page, actively push DiamanoPay status to our DB
  // This fires once (and retries every 5s) so the webhook delay doesn't block the user
  useEffect(() => {
    if (!isWaitingPayment || !rawId || !confirmedEmail) return;
    if (order?.status === "approved") return;

    const callVerify = async () => {
      const chargeId = chargeIdRef.current;
      if (!chargeId) return;
      try {
        await fetch(`${BASE}/api/payments/verify/${chargeId}`.replace("//", "/"));
      } catch { /* ignore */ }
    };

    // First call immediately, then every 5s (the React Query poll above handles the UI refresh)
    callVerify();
    const interval = setInterval(callVerify, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaitingPayment, rawId, confirmedEmail, order?.status]);

  const verifyPayment = useCallback(async () => {
    if (!rawId) return;
    setVerifying(true);
    try {
      const chargeId = chargeIdRef.current ?? (order as any)?.diamanopayChargeId;
      if (chargeId) {
        await fetch(`${BASE}/api/payments/verify/${chargeId}`.replace("//", "/"));
      }
      await refetch();
    } catch { /* ignore */ }
    setVerifying(false);
  }, [order, rawId, refetch]);

  const formatPrice = (p: number) => p.toLocaleString("fr-FR") + " FCFA";
  const formatDate  = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  if (!rawId || rawId === 0) {
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>Suivre ma commande</h1>
            <p className="text-muted-foreground">Entrez votre ID de commande et votre email</p>
          </div>

          {savedOrders.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Mes commandes récentes</h2>
              </div>
              <div className="space-y-2">
                {savedOrders.map((o) => (
                  <a key={o.id} href={`/order/${o.id}?email=${encodeURIComponent(o.email)}`}
                    className="flex items-center justify-between bg-muted/50 hover:bg-muted rounded-lg px-3 py-2.5 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Commande #{o.id}</p>
                      <p className="text-xs text-muted-foreground">{o.name} · {formatDate(o.createdAt)}</p>
                    </div>
                    <span className="text-xs text-primary font-medium">Voir →</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-card-border rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-sm">Rechercher une commande</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">ID de commande</label>
                <Input placeholder="Ex: 42" type="number" id="order-id-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Votre email</label>
                <Input placeholder="moussa@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => {
                const idEl = document.getElementById("order-id-input") as HTMLInputElement;
                const id = parseInt(idEl?.value ?? "0", 10);
                if (!id || !email) return;
                window.location.href = `/order/${id}?email=${encodeURIComponent(email)}`;
              }}>
                Rechercher ma commande
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!confirmedEmail) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-card border border-card-border rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">Confirmez votre email</h2>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit((d) => setConfirmedEmail(d.email))}>
              <FormField control={emailForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email utilisé lors de la commande</FormLabel>
                  <FormControl><Input type="email" placeholder="moussa@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-4">Voir ma commande</Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  if (isLoading || verifying) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {verifying && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Vérification de votre paiement en cours…
          </div>
        )}
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Commande introuvable</h2>
          <p className="text-muted-foreground mb-4 text-sm">Vérifiez l'ID et l'email de votre commande.</p>
          <Button variant="outline" onClick={() => setConfirmedEmail("")}>Réessayer</Button>
        </div>
      </div>
    );
  }

  const statusKey = order.status as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Accueil
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>Commande #{order.id}</h1>
          <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
        </div>

        {/* Bannière retour DiamanoPay */}
        {paymentStatus === "success" && order.status !== "approved" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              Votre paiement est en cours de confirmation. Actualisez dans quelques secondes.
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={verifyPayment}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </Button>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700 mb-5">
            Paiement annulé. Vous pouvez réessayer depuis cette page.
          </div>
        )}

        {/* Statut */}
        <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 ${statusCfg.color}`}>
          <StatusIcon className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{statusCfg.label}</p>
            {order.adminNote && <p className="text-sm mt-0.5">Note : {order.adminNote}</p>}
          </div>
          {order.status !== "approved" && (
            <Button size="sm" variant="ghost" className="gap-1 text-xs flex-shrink-0" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Documents commandés */}
        <div className="bg-card border border-card-border rounded-xl p-5 mb-5">
          <h2 className="font-bold mb-4">Documents commandés</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.documentTitle}</p>
                    <p className="text-xs text-muted-foreground">{item.documentSubject} — {item.documentLevel}</p>
                  </div>
                  <span className="font-bold text-sm text-primary">{formatPrice(item.price)}</span>
                </div>
                {order.status === "approved" && (
                  <DocumentFileDownloads documentId={item.documentId ?? null} orderId={order.id} email={confirmedEmail} />
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-4 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        {/* Bouton finaliser paiement si pending et URL disponible */}
        {order.status === "pending" && (order as any).diamanopayCheckoutUrl && (
          <div className="bg-card border border-card-border rounded-xl p-5 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Votre paiement n'a pas encore été finalisé.</p>
            <a href={(order as any).diamanopayCheckoutUrl}>
              <Button className="gap-2">
                💳 Finaliser le paiement ({formatPrice(order.totalAmount)})
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
