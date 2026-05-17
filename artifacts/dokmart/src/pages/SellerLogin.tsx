import { useState } from "react";
import { useLocation } from "wouter";
import { Store, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function SellerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast({ title: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/seller/auth/login`.replace("//", "/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Identifiants incorrects", variant: "destructive" });
        return;
      }
      navigate("/seller/dashboard");
    } catch {
      toast({ title: "Erreur de connexion. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>
            Espace Vendeur
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connectez-vous à votre espace E-SERVICES
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Pas encore vendeur ?{" "}
          <a href="/become-seller" className="text-primary hover:underline font-medium">
            Candidater maintenant
          </a>
        </p>
      </div>
    </div>
  );
}
