"use client";

import React from "react";
import { AuthProvider } from "@/store/auth-context";
import { CartProvider } from "@/store/cart-context";
import { CurrencyProvider } from "@/store/currency-context";
import { ToastProvider } from "@/components/ui/toast/ToastContext";
import { useToastUtils, setGlobalToastContext } from "@/lib/utils/toast";

interface AppProvidersProps {
  children: React.ReactNode;
}

function ToastInitializer({ children }: { children: React.ReactNode }) {
  const toastUtils = useToastUtils();
  
  // Initialize global toast context for direct usage
  React.useEffect(() => {
    setGlobalToastContext(toastUtils);
  }, [toastUtils]);

  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          <ToastProvider>
            <ToastInitializer>
              {children}
            </ToastInitializer>
          </ToastProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
