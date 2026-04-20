"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import productData from "@/data/product.json";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productPrice: number;
  productImage: string;
  vendor: string;
};

type Cart = {
  items: CartItem[];
};

type CartContextType = {
  cart: Cart;
  isLoading: boolean;
  itemCount: number;
  total: number;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refreshCart: () => void;
};

const CART_STORAGE_KEY = "onlinemandawee-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

// Get product details from JSON
const getProductDetails = (productId: string) => {
  return productData.featuredProducts.find((p) => p.id === productId);
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart:", e);
      }
    }
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

  const refreshCart = useCallback(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart:", e);
      }
    }
  }, []);

  const addItem = async (productId: string, quantity: number) => {
    setIsLoading(true);
    
    const product = getProductDetails(productId);
    if (!product) {
      setIsLoading(false);
      throw new Error("Product not found");
    }

    setCart((prev) => {
      const existingItem = prev.items.find((item) => item.productId === productId);
      
      let newCart;
      if (existingItem) {
        // Update quantity if item exists
        newCart = {
          items: prev.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${productId}-${Date.now()}`,
          productId,
          quantity,
          productName: product.name.en,
          productPrice: product.price,
          productImage: product.image,
          vendor: product.vendor,
        };
        newCart = {
          items: [...prev.items, newItem],
        };
      }
      
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
      return newCart;
    });

    setIsLoading(false);
  };

  const removeItem = async (itemId: string) => {
    setCart((prev) => {
      const newCart = {
        items: prev.items.filter((item) => item.id !== itemId),
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
      return newCart;
    });
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(itemId);
    }

    setCart((prev) => {
      const newCart = {
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
      return newCart;
    });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        refreshCart,
      }}
    >
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
