"use client";

import { Banknote, Gift, LayoutDashboard, Scale, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { useAuth } from "@/store/auth-context";

type CustomerDashboardLayoutProps = {
  children: React.ReactNode;
};

export function CustomerDashboardLayout({ children }: CustomerDashboardLayoutProps) {
  const { user } = useAuth();
  const t = useTranslations("Dashboard.customer");
  const firstName = user?.fullName?.trim().split(/\s+/)[0];
  const topBarTitle = firstName
    ? t("titleWithName", { firstName })
    : t("title");

  return (
    <RoleDashboardLayout
      topBarTitle={topBarTitle}
      items={[
        {
          label: t("nav.overview"),
          href: "/account",
          icon: <LayoutDashboard size={16} />,
        },
        {
          label: t("nav.giftRequests"),
          href: "/account/gift-requests",
          icon: <Gift size={16} />,
        },
        {
          label: t("nav.hawala"),
          href: "/account/hawala",
          icon: <Banknote size={16} />,
        },
        {
          label: t("nav.disputes"),
          href: "/account/disputes",
          icon: <Scale size={16} />,
        },
        {
          label: t("nav.settings"),
          href: "/account/settings",
          icon: <Settings size={16} />,
        },
      ]}
    >
      {children}
    </RoleDashboardLayout>
  );
}
