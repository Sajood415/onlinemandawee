"use client";

import { useTranslations } from "next-intl";
import {
  Gift,
  LayoutDashboard,
  Package,
  PackageSearch,
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
        { label: t("nav.categories"), href: "/admin/categories", icon: <Tag size={16} /> },
        { label: t("nav.giftRequests"), href: "/admin/gift-requests", icon: <Gift size={16} /> },
        { label: t("nav.users"), href: "/admin/users", icon: <Users size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
