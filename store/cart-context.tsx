"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

type CartItem = {
  id: string;
  productId: string;
  vendorProfileId: string;
  quantity: number;
  currencySnapshot: string;
  unitPriceSnapshot: number;
  productNameSnapshot: string;
  productImageSnapshot?: string;
};

type Cart = {
  id: string;
  userId: string;
  currency: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
};

type CartContextType = {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  total: number;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const total = cart?.items.reduce((sum, item) => sum + (item.unitPriceSnapshot * item.quantity), 0) || 0;

  const getAuthToken = () => {
    return localStorage.getItem("accessToken");
  };

  const refreshCart = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (productId: string, quantity: number) => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    setIsLoading(true);
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) throw new Error("Failed to add item");

      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to remove item");

      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) throw new Error("Failed to update quantity");

      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
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
