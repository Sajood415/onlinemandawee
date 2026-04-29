"use client";

import { motion } from "framer-motion";

export function ProductSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
    >
      <div className="relative h-48 bg-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
      </div>
      <div className="p-5">
        <div className="mb-3">
          <div className="mb-2 h-6 w-full rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-3/4 rounded-lg bg-slate-100 animate-pulse" />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-4 w-16 rounded-lg bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 h-7 w-20 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-3 w-16 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export function CategorySkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-[165px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_6px_14px_rgba(15,23,42,0.08)]"
    >
      <div className="relative h-22 overflow-hidden rounded-md bg-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
      </div>
      <div className="mt-2.5 h-4 w-full rounded-lg bg-slate-100 animate-pulse" />
    </motion.div>
  );
}

export function VendorSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
    >
      <div className="relative h-32 w-full bg-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
      </div>
      <div className="p-5">
        <div className="mb-1 h-5 w-full rounded-lg bg-slate-100 animate-pulse" />
        <div className="mb-2 h-4 w-3/4 rounded-lg bg-slate-100 animate-pulse" />
        <div className="mb-4 h-4 w-16 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
      </div>
    </motion.div>
  );
}
