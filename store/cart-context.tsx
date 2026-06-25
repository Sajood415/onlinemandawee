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
import {
  fetchPublicCatalogProduct,
  resolveDefaultCatalogVariant,
  resolveProductUnitPriceMinor,
} from "@/lib/products/public-catalog";
import { assertSufficientStock } from "@/lib/products/product-stock";
import { useCurrency } from "@/store/currency-context";

type CartItem = {
  id: string;
  productId: string;
  variantId?: string;
  variantName?: string;
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

type AddCartItemOptions = {
  variantId?: string;
  variantName?: string;
};

type CartContextType = {
  cart: Cart;
  isLoading: boolean;
  itemCount: number;
  total: number;
  displayTotal: number;
  addItem: (productId: string, quantity: number, options?: AddCartItemOptions) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refreshCart: () => void;
};

const CART_STORAGE_KEY = "onlinemandawee-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartLineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? ""}`;
}


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

  const addItem = async (
    productId: string,
    quantity: number,
    options?: AddCartItemOptions
  ) => {
    setIsLoading(true);

    try {
      const catalogProduct = await fetchPublicCatalogProduct(productId);
      const activeVariants = catalogProduct.variants?.filter((variant) => variant.isActive) ?? [];
      const variantId =
        options?.variantId ??
        (activeVariants.length === 1 ? activeVariants[0]?.id : undefined);
      const selectedVariant = variantId
        ? activeVariants.find((variant) => variant.id === variantId)
        : resolveDefaultCatalogVariant(catalogProduct.variants);

      if (activeVariants.length > 1 && !variantId) {
        throw new Error("Choose a product option before adding to cart.");
      }

      const lineKey = cartLineKey(productId, variantId);
      const existingItem = cart.items.find(
        (item) => cartLineKey(item.productId, item.variantId) === lineKey
      );
      const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
      const stockCheck = assertSufficientStock(catalogProduct, nextQuantity, variantId);

      if (!stockCheck.ok) {
        throw new Error(stockCheck.message);
      }

      const unitPriceMinor = resolveProductUnitPriceMinor(
        catalogProduct.basePriceAmount,
        catalogProduct.variants,
        variantId
      );

      setCart((prev) => {
        const existing = prev.items.find(
          (item) => cartLineKey(item.productId, item.variantId) === lineKey
        );

        let newCart: Cart;
        if (existing) {
          newCart = {
            items: prev.items.map((item) =>
              cartLineKey(item.productId, item.variantId) === lineKey
                ? { ...item, quantity: nextQuantity }
                : item
            ),
          };
        } else {
          const newItem: CartItem = {
            id: `${lineKey}-${Date.now()}`,
            productId,
            variantId,
            variantName: options?.variantName ?? selectedVariant?.name,
            quantity,
            productName: catalogProduct.name.en,
            productDescription: catalogProduct.description.en,
            productPrice: unitPriceMinor / 100,
            productCurrency: catalogProduct.currency || "USD",
            productImage: catalogProduct.image,
            vendor: catalogProduct.vendor,
            delivery: catalogProduct.delivery,
            vendorProfileId: catalogProduct.vendorProfileId,
            sellerType: catalogProduct.sellerType,
            isVendorProduct: catalogProduct.isVendorProduct,
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

    const targetItem = cart.items.find((item) => item.id === itemId);
    if (!targetItem) return;

    const catalogProduct = await fetchPublicCatalogProduct(targetItem.productId);
    const stockCheck = assertSufficientStock(
      catalogProduct,
      quantity,
      targetItem.variantId
    );
    if (!stockCheck.ok) {
      throw new Error(stockCheck.message);
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
