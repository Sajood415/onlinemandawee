"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  BarChart3,
  CreditCard,
  Gift,
  ImageIcon,
  LayoutDashboard,
  Package,
  PackageSearch,
  Warehouse,
  Scale,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Tags,
  Truck,
  Wallet,
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
        { label: t("nav.deliveryRules"), href: "/admin/delivery-rules", icon: <Truck size={16} /> },
        { label: t("nav.payouts"), href: "/admin/payouts", icon: <Wallet size={16} /> },
        { label: t("nav.warehouse"), href: "/admin/warehouse", icon: <Warehouse size={16} /> },
        { label: t("nav.disputes"), href: "/admin/disputes", icon: <Scale size={16} /> },
        {
          label: t("nav.reports"),
          href: "/admin/reports?tab=salesByCategory",
          icon: <BarChart3 size={16} />,
        },
        {
          label: t("nav.membershipFees"),
          href: "/admin/reports?tab=membership",
          icon: <CreditCard size={16} />,
        },
        { label: t("nav.categories"), href: "/admin/categories", icon: <Tag size={16} /> },
        {
          label: t("nav.subCategories"),
          href: "/admin/categories/subcategories",
          icon: <Tags size={16} />,
        },
        { label: t("nav.banners"), href: "/admin/banners", icon: <ImageIcon size={16} /> },
        { label: t("nav.reviews"), href: "/admin/reviews", icon: <Star size={16} /> },
        { label: t("nav.giftRequests"), href: "/admin/gift-requests", icon: <Gift size={16} /> },
        { label: t("nav.hawala"), href: "/admin/hawala", icon: <Banknote size={16} /> },
        { label: t("nav.settings"), href: "/admin/settings", icon: <Settings size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
