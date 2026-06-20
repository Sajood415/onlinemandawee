import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { routing } from "@/i18n/routing";
import { AppProviders } from "@/components/providers/AppProviders";
import { PublicSiteLayout } from "@/components/layout/PublicSiteLayout";
import { isStorefrontLocale } from "@/lib/platform/storefront-options";
import { PlatformSettingsService } from "@/services/platform-settings.service";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const platformSettings = await new PlatformSettingsService().get();

  if (
    isStorefrontLocale(locale) &&
    !platformSettings.availableLocales.includes(locale)
  ) {
    redirect(`/${platformSettings.availableLocales[0]}`);
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders
        initialPlatformConfig={{
          transactionFeeLabel: platformSettings.transactionFeeLabel,
          availableLocales: platformSettings.availableLocales,
          availableCurrencies: platformSettings.availableCurrencies,
        }}
      >
        <PublicSiteLayout>{children}</PublicSiteLayout>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
