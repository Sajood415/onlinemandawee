"use client";

import { useTranslations } from "next-intl";

import { RoleSectionPlaceholder } from "@/components/dashboard/RoleSectionPlaceholder";

export default function AdminOrdersPage() {
  const t = useTranslations("AdminPages");
  return <RoleSectionPlaceholder role="ADMIN" title={t("orders")} />;
}
