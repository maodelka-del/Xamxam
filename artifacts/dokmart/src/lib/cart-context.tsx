import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Document } from "@workspace/api-client-react";

interface CartItem extends Document {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (doc: Document) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dokmart_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("dokmart_cart", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addItem = (doc: Document) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === doc.id);
      if (existing) {
        return current; // Documents are digital, so max 1 quantity makes sense
      }
      return [...current, { ...doc, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.length;
  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
