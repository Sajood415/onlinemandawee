"use client";

import { useTranslations } from "next-intl";

import { RoleSectionPlaceholder } from "@/components/dashboard/RoleSectionPlaceholder";

export default function AdminReportsPage() {
  const t = useTranslations("AdminPages");
  return <RoleSectionPlaceholder role="ADMIN" title={t("reports")} />;
}
