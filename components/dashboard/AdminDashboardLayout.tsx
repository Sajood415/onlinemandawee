"use client";

import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  PackageSearch,
  Settings,
  ShoppingBag,
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
        { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
        { label: "Users", href: "/admin/users", icon: <Users size={16} /> },
        { label: "Vendors", href: "/admin/vendors", icon: <PackageSearch size={16} /> },
        { label: "Products", href: "/admin/products", icon: <Boxes size={16} /> },
        { label: "Orders", href: "/admin/orders", icon: <ShoppingBag size={16} /> },
        { label: "Reports", href: "/admin/reports", icon: <BarChart3 size={16} /> },
        { label: "Settings", href: "/admin/settings", icon: <Settings size={16} /> },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
