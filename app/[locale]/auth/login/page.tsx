import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageLoader } from "@/components/ui/PageLoader";
import { LoginPageClient } from "./LoginPageClient";

export default async function LoginPage() {
  const t = await getTranslations("Common");

  return (
    <Suspense fallback={<PageLoader message={t("loadingLogin")} fullScreen />}>
      <LoginPageClient />
    </Suspense>
  );
}
