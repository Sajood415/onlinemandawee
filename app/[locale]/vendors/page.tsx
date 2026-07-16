"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { VendorsShowcase } from "@/components/vendors/VendorsShowcase";

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef1f6]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
        </div>
      }
    >
      <VendorsShowcase />
    </Suspense>
  );
}
