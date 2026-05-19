"use client";

import {
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
  return (
    <RoleDashboardLayout
      topBarTitle="Admin Dashboard"
      items={[
        { label: "Dashboard",  href: "/admin/dashboard",  icon: <LayoutDashboard size={16} /> },
        { label: "Vendors",    href: "/admin/vendors",    icon: <PackageSearch size={16} /> },
        { label: "Products",   href: "/admin/products",   icon: <Package size={16} /> },
        { label: "Categories", href: "/admin/categories", icon: <Tag size={16} /> },
        { label: "Users",      href: "/admin/users",      icon: <Users size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
