"use client";

import React from "react";
import { AuthProvider } from "@/store/auth-context";
import { CartProvider } from "@/store/cart-context";
import { CurrencyProvider } from "@/store/currency-context";
import { WishlistProvider } from "@/store/wishlist-context";
import { ToastProvider } from "@/components/ui/toast/ToastContext";
import { useToastUtils, setGlobalToastContext } from "@/lib/utils/toast";
import {
  PlatformConfigProvider,
  type PlatformConfig,
} from "@/components/providers/PlatformConfigProvider";
import { StripePreloader } from "@/components/providers/StripePreloader";

interface AppProvidersProps {
  children: React.ReactNode;
  initialPlatformConfig?: PlatformConfig;
}

function ToastInitializer({ children }: { children: React.ReactNode }) {
  const toastUtils = useToastUtils();
  
  // Initialize global toast context for direct usage
  React.useEffect(() => {
    setGlobalToastContext(toastUtils);
  }, [toastUtils]);

  return <>{children}</>;
}

export function AppProviders({ children, initialPlatformConfig }: AppProvidersProps) {
  return (
    <AuthProvider>
      <PlatformConfigProvider initialConfig={initialPlatformConfig}>
        <CurrencyProvider>
          <CartProvider>
            <WishlistProvider>
              <ToastProvider>
                <ToastInitializer>
                  <StripePreloader />
                  {children}
                </ToastInitializer>
              </ToastProvider>
            </WishlistProvider>
          </CartProvider>
        </CurrencyProvider>
      </PlatformConfigProvider>
    </AuthProvider>
  );
}
