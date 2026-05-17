import { Link } from "wouter";
import { Trash2, ShoppingCart, ArrowRight, BookOpen } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export default function Cart() {
  const { items, removeItem, total, count } = useCart();

  const formatPrice = (p: number) => p.toLocaleString("fr-FR") + " FCFA";

  if (count === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <ShoppingCart className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>
          Votre panier est vide
        </h2>
        <p className="text-muted-foreground mb-6">Decouvrez notre catalogue et ajoutez des documents.</p>
        <Link href="/catalog">
          <Button className="gap-2">
            <BookOpen className="w-4 h-4" />
            Explorer le catalogue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--app-font-serif)" }}>
          Mon panier ({count} document{count !== 1 ? "s" : ""})
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4"
                data-testid={`item-cart-${item.id}`}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.subject} — {item.level}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-primary" data-testid={`text-price-cart-${item.id}`}>
                    {formatPrice(item.price)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-1">
            <div className="bg-card border border-card-border rounded-xl p-5 sticky top-24">
              <h2 className="font-bold text-lg mb-4">Resume de commande</h2>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">{item.title}</span>
                    <span className="font-medium flex-shrink-0">{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 mb-5">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary" data-testid="text-cart-total">{formatPrice(total)}</span>
                </div>
              </div>
              <Link href="/checkout">
                <Button className="w-full gap-2" size="lg" data-testid="button-checkout">
                  Commander <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/catalog">
                <Button variant="ghost" className="w-full mt-2 text-sm">
                  Continuer mes achats
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
