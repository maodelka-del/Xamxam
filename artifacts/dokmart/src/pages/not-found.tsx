import { Link } from "wouter";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <BookOpen className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-5xl font-bold text-primary mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>404</h1>
      <h2 className="text-xl font-bold mb-2">Page introuvable</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        La page que vous cherchez n'existe pas ou a ete deplacee.
      </p>
      <Link href="/">
        <Button className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour a l'accueil
        </Button>
      </Link>
    </div>
  );
}
