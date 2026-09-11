import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SupplyRequestTrack } from "@/components/supply/SupplyRequestTrack";

type SearchParams = Promise<{ token?: string }>;

export default async function SupplyRequestTrackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-[360px] items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-neutral-900">
            No Product Supply Request tracking link.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Please use the link from your confirmation email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[360px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
        </div>
      }
    >
      <SupplyRequestTrack token={token} />
    </Suspense>
  );
}
