"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Scale,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Megaphone,
} from "lucide-react";

import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { SubscriptionBillingBanner } from "@/components/vendor/SubscriptionBillingBanner";
import { useVendorStoreName } from "@/components/dashboard/use-vendor-store-name";

type VendorDashboardLayoutProps = {
  children: React.ReactNode;
};

export function VendorDashboardLayout({ children }: VendorDashboardLayoutProps) {
  const { storeName, storeSlug } = useVendorStoreName();
  const t = useTranslations("Dashboard.vendor");
  const topBarTitle = storeName
    ? t("titleWithStore", { storeName })
    : t("title");

  const items = [
    { label: t("nav.dashboard"), href: "/vendor/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: t("nav.products"), href: "/vendor/products", icon: <Package size={16} /> },
    { label: t("nav.coupons"), href: "/vendor/coupons", icon: <Tag size={16} /> },
    { label: t("nav.promotions"), href: "/vendor/promotions", icon: <Megaphone size={16} /> },
    { label: t("nav.orders"), href: "/vendor/orders", icon: <ShoppingCart size={16} /> },
    { label: t("nav.disputes"), href: "/vendor/disputes", icon: <Scale size={16} /> },
    { label: t("nav.reports"), href: "/vendor/reports", icon: <BarChart3 size={16} /> },
    { label: t("nav.settings"), href: "/vendor/settings", icon: <Settings size={16} /> },
    ...(storeSlug
      ? [
          {
            label: t("nav.viewStore"),
            href: `/vendors/${storeSlug}`,
            icon: <Store size={16} />,
          },
        ]
      : []),
  ];

  return (
    <RoleDashboardLayout topBarTitle={topBarTitle} items={items}>
      <SubscriptionBillingBanner />
      {children}
    </RoleDashboardLayout>
  );
}
