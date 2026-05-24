import { Suspense } from "react";

import { PageLoader } from "@/components/ui/PageLoader";
import { LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading login..." fullScreen />}>
      <LoginPageClient />
    </Suspense>
  );
}
