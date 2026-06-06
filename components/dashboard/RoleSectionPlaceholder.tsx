"use client";

import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";

type DashboardRole = "ADMIN" | "VENDOR";

type RoleSectionPlaceholderProps = {
  role: DashboardRole;
  title: string;
};

export function RoleSectionPlaceholder({ role, title }: RoleSectionPlaceholderProps) {
  const { isLoading, user } = useDashboardGuard(role);
  const tc = useTranslations("Common");

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-600">{tc("loading")}</p>
      </div>
    );
  }

  return <p className="text-2xl font-semibold tracking-tight text-[#0f3460]">{title}</p>;
}
