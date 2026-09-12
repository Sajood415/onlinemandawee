"use client";

import { Suspense, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2, ShoppingCart } from "lucide-react";

import { ProductDetailShowcase } from "@/components/products/ProductDetailShowcase";
import { ProductsCatalogShowcase } from "@/components/products/ProductsCatalogShowcase";
import { getProductDetailCopy } from "@/components/products/product-detail-copy";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import { isMongoObjectId } from "@/lib/db/object-id";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProduct } from "@/lib/products/public-catalog";
import { fetchRelatedProductsByCategory } from "@/lib/products/related-products";

function ProductDetailById({ productId }: { productId: string }) {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getProductDetailCopy(locale);

  const [product, setProduct] = useState<Awaited<
    ReturnType<typeof fetchPublicCatalogProduct>
  > | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const resolved = await fetchPublicCatalogProduct(productId);
        if (!mounted) return;
        setProduct(resolved);

        const related = await fetchRelatedProductsByCategory(resolved.category, resolved.id);
        if (!mounted) return;
        setRelatedProducts(related);
      } catch {
        if (mounted) {
          setProduct(null);
          setRelatedProducts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-secondary/35" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white px-4">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-neutral-300" strokeWidth={1.5} />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">{copy.notFound}</h1>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
          >
            <ChevronLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            {copy.backToProducts}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProductDetailShowcase
      product={product}
      relatedProducts={relatedProducts}
      locale={locale}
      isRtl={isRtl}
    />
  );
}

function CategoryCatalogBySlug({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef1f6]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
        </div>
      }
    >
      <ProductsCatalogShowcase pathCategorySlug={slug} />
    </Suspense>
  );
}

export default function ProductsSegmentPage() {
  const params = useParams();
  const segment = params.id as string;

  if (isMongoObjectId(segment)) {
    return <ProductDetailById productId={segment} />;
  }

  return <CategoryCatalogBySlug slug={segment} />;
}
