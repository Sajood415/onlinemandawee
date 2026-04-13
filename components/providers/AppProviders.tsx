"use client";

import { AuthProvider } from "@/store/auth-context";
import { CartProvider } from "@/store/cart-context";
import { CurrencyProvider } from "@/store/currency-context";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
