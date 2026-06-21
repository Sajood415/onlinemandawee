"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { fetchPublicCatalogProduct } from "@/lib/products/public-catalog";
import { useCurrency } from "@/store/currency-context";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productCurrency: string;
  productImage: string;
  vendor: string;
  delivery: string;
  vendorProfileId?: string | null;
  sellerType?: "PLATFORM" | "THIRD_PARTY";
  isVendorProduct?: boolean;
};

type Cart = {
  items: CartItem[];
};

type CartContextType = {
  cart: Cart;
  isLoading: boolean;
  itemCount: number;
  total: number;
  displayTotal: number;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refreshCart: () => void;
};

const CART_STORAGE_KEY = "onlinemandawee-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

const resolveProductDetails = async (productId: string) => {
  const catalogProduct = await fetchPublicCatalogProduct(productId);
  return {
    name: catalogProduct.name.en,
    description: catalogProduct.description.en,
    price: catalogProduct.price,
    currency: catalogProduct.currency || "USD",
    image: catalogProduct.image,
    vendor: catalogProduct.vendor,
    delivery: catalogProduct.delivery,
    vendorProfileId: catalogProduct.vendorProfileId,
    sellerType: catalogProduct.sellerType,
    isVendorProduct: catalogProduct.isVendorProduct,
  };
};

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    productCurrency: item.productCurrency ?? "USD",
  };
}

function normalizeCart(cart: Cart): Cart {
  return {
    items: cart.items.map(normalizeCartItem),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { currency, convertPrice } = useCurrency();
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setCart(normalizeCart(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to parse cart:", e);
      }
    }
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const total = useMemo(
    () =>
      cart.items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0),
    [cart.items]
  );

  const displayTotal = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) =>
          sum +
          convertPrice(item.productPrice, item.productCurrency) * item.quantity,
        0
      ),
    [cart.items, convertPrice, currency]
  );

  const refreshCart = useCallback(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setCart(normalizeCart(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to parse cart:", e);
      }
    }
  }, []);

  const addItem = async (productId: string, quantity: number) => {
    setIsLoading(true);

    try {
      const product = await resolveProductDetails(productId);

      setCart((prev) => {
        const existingItem = prev.items.find((item) => item.productId === productId);

        let newCart;
        if (existingItem) {
          newCart = {
            items: prev.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          };
        } else {
          const newItem: CartItem = {
            id: `${productId}-${Date.now()}`,
            productId,
            quantity,
            productName: product.name,
            productDescription: product.description,
            productPrice: product.price,
            productCurrency: product.currency,
            productImage: product.image,
            vendor: product.vendor,
            delivery: product.delivery,
            vendorProfileId: product.vendorProfileId,
            sellerType: product.sellerType,
            isVendorProduct: product.isVendorProduct,
          };
          newCart = {
            items: [...prev.items, newItem],
          };
        }

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
        return newCart;
      });
    } finally {
      setIsLoading(false);
    }
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
        displayTotal,
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
