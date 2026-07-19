"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AdminCategoryManager } from "@/components/admin/categories/AdminCategoryManager";

export default function AdminCategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      }
    >
      <AdminCategoryManager />
    </Suspense>
  );
}
