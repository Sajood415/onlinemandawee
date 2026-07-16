import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageLoader } from "@/components/ui/PageLoader";
import { SignupPageClient } from "./SignupPageClient";

export default async function SignupPage() {
  const t = await getTranslations("Common");

  return (
    <Suspense fallback={<PageLoader message={t("loadingSignup")} fullScreen />}>
      <SignupPageClient />
    </Suspense>
  );
}
