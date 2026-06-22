import Link from "next/link";
import { AlertTriangle, Home, PackageSearch, Tag, Baby } from "lucide-react";

export default function GlobalNotFoundPage() {
  return (
    <main className="min-h-[70vh] bg-[#f6f8fc] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#0f3460]/10 bg-white shadow-[0_20px_60px_rgba(15,52,96,0.08)]">
        <div className="bg-linear-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] px-6 py-10 text-white sm:px-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <AlertTriangle className="h-4 w-4" />
            Page Not Found
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            We could not find this page
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/90 sm:text-base">
            The link may be outdated or the page has moved. Continue shopping from one of the
            main marketplace sections.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2847]"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <PackageSearch className="h-4 w-4" />
              Products
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <Tag className="h-4 w-4" />
              Deals
            </Link>
            <Link
              href="/baby-packages"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <Baby className="h-4 w-4" />
              Baby Packages
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
