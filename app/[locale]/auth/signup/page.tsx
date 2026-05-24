import { Suspense } from "react";

import { PageLoader } from "@/components/ui/PageLoader";
import { SignupPageClient } from "./SignupPageClient";

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading signup..." fullScreen />}>
      <SignupPageClient />
    </Suspense>
  );
}
