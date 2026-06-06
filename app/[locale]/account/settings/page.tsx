"use client";

import { useTranslations } from "next-intl";

import { CustomerProfileSection } from "@/components/customer/CustomerProfileSection";
import { PageLoader } from "@/components/ui/PageLoader";
import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";

export default function CustomerSettingsPage() {
  const { isLoading, user } = useCustomerRouteGuard();
  const t = useTranslations("Account.settings");
  const tc = useTranslations("Common");

  if (isLoading) {
    return <PageLoader message={tc("checkingAccount")} fullScreen />;
  }

  if (!user) return null;

  return (
    <div className="w-full bg-neutral-50 pb-16">
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <CustomerProfileSection variant="settings" />
      </div>
    </div>
  );
}
