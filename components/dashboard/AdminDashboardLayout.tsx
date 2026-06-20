"use client";

import { useTranslations } from "next-intl";
import {
  Gift,
  ImageIcon,
  LayoutDashboard,
  Package,
  PackageSearch,
  Scale,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from "lucide-react";

import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";

type AdminDashboardLayoutProps = {
  children: React.ReactNode;
};

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const t = useTranslations("Dashboard.admin");

  return (
    <RoleDashboardLayout
      topBarTitle={t("title")}
      items={[
        { label: t("nav.dashboard"), href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
        { label: t("nav.vendors"), href: "/admin/vendors", icon: <PackageSearch size={16} /> },
        { label: t("nav.products"), href: "/admin/products", icon: <Package size={16} /> },
        { label: t("nav.orders"), href: "/admin/orders", icon: <ShoppingBag size={16} /> },
        { label: t("nav.disputes"), href: "/admin/disputes", icon: <Scale size={16} /> },
        { label: t("nav.categories"), href: "/admin/categories", icon: <Tag size={16} /> },
        { label: t("nav.banners"), href: "/admin/banners", icon: <ImageIcon size={16} /> },
        { label: t("nav.giftRequests"), href: "/admin/gift-requests", icon: <Gift size={16} /> },
        { label: t("nav.users"), href: "/admin/users", icon: <Users size={16} /> },
        { label: t("nav.settings"), href: "/admin/settings", icon: <Settings size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
