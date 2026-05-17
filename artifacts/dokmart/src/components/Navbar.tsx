import { Link, useLocation } from "wouter";
import { ShoppingCart, Store, Menu, X, Package, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { count } = useCart();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/catalog", label: "Catalogue" },
    { href: "/levels", label: "Niveaux" },
    { href: "/order/0", label: "Mes commandes" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl text-primary leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>
                E-SERVICES
              </span>
              <span className="hidden sm:block text-[9px] text-muted-foreground leading-none tracking-wider uppercase font-medium">
                Marketplace Numérique
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  location === link.href || (link.href === "/order/0" && location.startsWith("/order"))
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/seller/login"
              className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1"
            >
              Vendre <ChevronDown className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/order/0" className="hidden sm:block md:hidden">
              <Button variant="outline" size="sm" className="gap-2">
                <Package className="w-4 h-4" />
                <span>Commandes</span>
              </Button>
            </Link>

            <Link href="/cart" data-testid="link-cart">
              <Button variant="outline" size="sm" className="relative gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Panier</span>
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </Button>
            </Link>
            <button
              className="md:hidden p-2"
              onClick={() => setOpen(!open)}
              data-testid="button-mobile-menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium rounded-md hover:bg-muted transition-colors ${
                  location === link.href || (link.href === "/order/0" && location.startsWith("/order"))
                    ? "text-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => setOpen(false)}
              >
                {link.href === "/order/0" && <Package className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
            <Link
              href="/seller/login"
              className="flex items-center gap-2 px-2 py-2.5 text-sm font-medium text-secondary rounded-md hover:bg-secondary/5 transition-colors"
              onClick={() => setOpen(false)}
            >
              Devenir Vendeur
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
