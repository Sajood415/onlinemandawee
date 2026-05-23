import { Suspense } from "react";

import { SignupPageClient } from "./SignupPageClient";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-neutral-50 px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-[#0f3460]">Create account</h1>
            <p className="mt-2 text-sm text-neutral-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupPageClient />
    </Suspense>
  );
}
