"use client";

import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Wallet,
  Megaphone,
} from "lucide-react";

import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { useVendorStoreName } from "@/components/dashboard/use-vendor-store-name";

type VendorDashboardLayoutProps = {
  children: React.ReactNode;
};

export function VendorDashboardLayout({ children }: VendorDashboardLayoutProps) {
  const { storeName } = useVendorStoreName();
  const topBarTitle = storeName ? `${storeName}'s Dashboard` : "Vendor Dashboard";

  return (
    <RoleDashboardLayout
      topBarTitle={topBarTitle}
      items={[
        { label: "Dashboard", href: "/vendor/dashboard", icon: <LayoutDashboard size={16} /> },
        { label: "Products", href: "/vendor/products", icon: <Package size={16} /> },
        { label: "Coupons", href: "/vendor/coupons", icon: <Tag size={16} /> },
        { label: "Promotions", href: "/vendor/promotions", icon: <Megaphone size={16} /> },
        { label: "Orders", href: "/vendor/orders", icon: <ShoppingCart size={16} /> },
        { label: "Payouts", href: "/vendor/payouts", icon: <Wallet size={16} /> },
        { label: "Reports", href: "/vendor/reports", icon: <BarChart3 size={16} /> },
        { label: "Settings", href: "/vendor/settings", icon: <Settings size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
