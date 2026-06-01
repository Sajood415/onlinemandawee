"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

export default function VendorPayoutsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/vendor/reports?tab=payouts");
  }, [router]);

  return null;
}
