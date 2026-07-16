import { serializePublicCategoryDetail } from "@/lib/categories/public-category";
import { parseCategoryImageUrl } from "@/lib/localization/category-content";
import {
  listPublicCouponsForProduct,
  listPublicCouponsForProducts,
  listPublicStorefrontOffers,
} from "@/lib/checkout/list-public-vendor-offers";
import { isMongoObjectId } from "@/lib/db/object-id";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import { CategoryRepository } from "@/repositories/category.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import type { PublicProductsQuery } from "@/validators/catalog.validator";

type PublicListFilters = {
  categoryIds?: string[];
  vendorStoreSlugs?: string[];
  search?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStock?: boolean;
  productIds?: string[];
};

type CatalogFacets = {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    parentId: string | null;
    count: number;
    children: Array<{
      id: string;
      slug: string;
      name: string;
      parentId: string | null;
      count: number;
    }>;
  }>;
  vendors: Array<{ storeSlug: string; storeName: string; count: number }>;
  priceMin: number;
  priceMax: number;
  inStockCount: number;
  onSaleCount: number;
};

function emptyFacets(): CatalogFacets {
  return {
    categories: [],
    vendors: [],
    priceMin: 0,
    priceMax: 0,
    inStockCount: 0,
    onSaleCount: 0,
  };
}

function isCouponCurrentlyValid(coupon: {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
}) {
  if (!coupon.isActive) return false;
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.expiresAt && coupon.expiresAt < now) return false;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return false;
  return true;
}

export class CatalogQueryService {
  constructor(
    private readonly categoryRepository = new CategoryRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository()
  ) {}

  async listCategories() {
    const categories = await this.categoryRepository.listActive();

    return categories.map((category) => ({
      ...category,
      image: parseCategoryImageUrl(category.translations) ?? undefined,
      children: category.children.map((child) => ({
        ...child,
        image: parseCategoryImageUrl(child.translations) ?? undefined,
      })),
    }));
  }

  async getCategoryBySlug(slug: string) {
    const resolvedSlug = slug === "baby" ? "baby-care" : slug;
    const category = await this.categoryRepository.findActiveBySlug(resolvedSlug);

    if (!category) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Category not found",
        statusCode: 404,
      });
    }

    return serializePublicCategoryDetail(category);
  }

  private async resolveOnSaleProductIds() {
    const coupons = await prisma.vendorCoupon.findMany({
      where: { isActive: true },
      select: {
        isActive: true,
        startsAt: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        appliesToAllProducts: true,
        productIds: true,
        vendorProfileId: true,
      },
    });

    const validCoupons = coupons.filter(isCouponCurrentlyValid);
    const onSaleIds = new Set<string>();
    const vendorIdsWithAllProducts: string[] = [];

    for (const coupon of validCoupons) {
      if (coupon.appliesToAllProducts) {
        vendorIdsWithAllProducts.push(coupon.vendorProfileId);
      } else {
        for (const productId of coupon.productIds) {
          onSaleIds.add(productId);
        }
      }
    }

    if (vendorIdsWithAllProducts.length > 0) {
      const vendorProducts = await prisma.product.findMany({
        where: {
          vendorProfileId: { in: [...new Set(vendorIdsWithAllProducts)] },
          approvalStatus: "APPROVED",
          isActive: true,
          vendorProfile: { status: "ACTIVE" },
        },
        select: { id: true },
      });

      for (const product of vendorProducts) {
        onSaleIds.add(product.id);
      }
    }

    return [...onSaleIds];
  }

  private async buildFacets(
    filters: PublicListFilters,
    onSaleProductIds: string[]
  ): Promise<CatalogFacets> {
    const filtersWithoutCategory: PublicListFilters = {
      ...filters,
      categoryIds: undefined,
    };
    const filtersWithoutVendor: PublicListFilters = {
      ...filters,
      vendorStoreSlugs: undefined,
    };
    const filtersWithoutPrice: PublicListFilters = {
      ...filters,
      minPriceMinor: undefined,
      maxPriceMinor: undefined,
    };
    const filtersWithoutInStock: PublicListFilters = {
      ...filters,
      inStock: undefined,
    };
    const filtersWithoutOnSale: PublicListFilters = {
      ...filters,
      productIds: undefined,
    };

    const [
      categoryGroups,
      vendorGroups,
      priceAgg,
      inStockCount,
      onSaleCount,
      activeCategories,
    ] = await Promise.all([
      this.productRepository.groupPublicByCategory(filtersWithoutCategory),
      this.productRepository.groupPublicByVendor(filtersWithoutVendor),
      this.productRepository.aggregatePublicPrice(filtersWithoutPrice),
      this.productRepository.countPublic({
        ...filtersWithoutInStock,
        inStock: true,
      }),
      onSaleProductIds.length > 0
        ? this.productRepository.countPublic({
            ...filtersWithoutOnSale,
            productIds: onSaleProductIds,
          })
        : Promise.resolve(0),
      this.categoryRepository.listActive(),
    ]);

    const countByCategoryId = new Map(
      categoryGroups.map((group) => [group.categoryId, group._count._all])
    );

    const categories = activeCategories.map((category) => {
      const children = category.children.map((child) => ({
        id: child.id,
        slug: child.slug,
        name: child.name,
        parentId: child.parentId,
        count: countByCategoryId.get(child.id) ?? 0,
      }));
      const directCount = countByCategoryId.get(category.id) ?? 0;
      const childrenCount = children.reduce((sum, child) => sum + child.count, 0);

      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        parentId: category.parentId,
        count: directCount + childrenCount,
        children,
      };
    });

    const vendorProfileIds = vendorGroups.map((group) => group.vendorProfileId);
    const vendorProfiles =
      vendorProfileIds.length > 0
        ? await prisma.vendorProfile.findMany({
            where: { id: { in: vendorProfileIds }, status: "ACTIVE" },
            select: { id: true, storeSlug: true, storeName: true },
          })
        : [];
    const vendorById = new Map(vendorProfiles.map((vendor) => [vendor.id, vendor]));
    const countByVendorId = new Map(
      vendorGroups.map((group) => [group.vendorProfileId, group._count._all])
    );

    const vendors = vendorProfileIds
      .map((vendorProfileId) => {
        const vendor = vendorById.get(vendorProfileId);
        if (!vendor?.storeSlug || !vendor.storeName) return null;
        return {
          storeSlug: vendor.storeSlug,
          storeName: vendor.storeName,
          count: countByVendorId.get(vendorProfileId) ?? 0,
        };
      })
      .filter((vendor): vendor is NonNullable<typeof vendor> => vendor != null)
      .sort((a, b) => b.count - a.count || a.storeName.localeCompare(b.storeName));

    const priceMinMinor = priceAgg._min.priceAmount ?? 0;
    const priceMaxMinor = priceAgg._max.priceAmount ?? 0;

    return {
      categories,
      vendors,
      priceMin: priceMinMinor / 100,
      priceMax: priceMaxMinor / 100,
      inStockCount,
      onSaleCount,
    };
  }

  async listProducts(filters: PublicProductsQuery) {
    const page = filters.page;
    const pageSize = filters.pageSize;
    const vendorStoreSlugs = [
      ...new Set([
        ...(filters.vendors ?? []),
        ...(filters.vendor ? [filters.vendor] : []),
      ]),
    ];

    let categoryIds: string[] | undefined;

    if (filters.category) {
      const normalizedCategory =
        filters.category === "baby" ? "baby-care" : filters.category;
      const category = await this.categoryRepository.findBySlug(normalizedCategory);

      if (!category || !category.isActive) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          facets: emptyFacets(),
        };
      }

      categoryIds = await this.categoryRepository.listActiveDescendantIds(category.id);
    }

    const onSaleProductIds = await this.resolveOnSaleProductIds();

    const baseFilters: PublicListFilters = {
      categoryIds,
      vendorStoreSlugs: vendorStoreSlugs.length > 0 ? vendorStoreSlugs : undefined,
      search: filters.search,
      minPriceMinor:
        filters.minPrice != null ? Math.round(filters.minPrice * 100) : undefined,
      maxPriceMinor:
        filters.maxPrice != null ? Math.round(filters.maxPrice * 100) : undefined,
      inStock: filters.inStock,
      productIds: filters.onSale ? onSaleProductIds : undefined,
    };

    if (filters.onSale && onSaleProductIds.length === 0) {
      const facets = await this.buildFacets(baseFilters, onSaleProductIds);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        facets,
      };
    }

    const [{ items, total }, facets] = await Promise.all([
      this.productRepository.listPublic({
        ...baseFilters,
        sort: filters.sort,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.buildFacets(baseFilters, onSaleProductIds),
    ]);

    if (items.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
        facets,
      };
    }

    const couponMap = await listPublicCouponsForProducts(
      items.map((product) => ({
        productId: product.id,
        vendorProfileId: product.vendorProfileId,
      }))
    );

    return {
      items: items.map((product) => ({
        ...product,
        availableCoupons: couponMap.get(product.id) ?? [],
      })),
      total,
      page,
      pageSize,
      facets,
    };
  }

  async getProduct(productId: string) {
    const product = isMongoObjectId(productId)
      ? await this.productRepository.findById(productId)
      : await this.productRepository.findBySlug(productId);

    if (
      !product ||
      product.approvalStatus !== "APPROVED" ||
      !product.isActive ||
      product.vendorProfile.status !== "ACTIVE"
    ) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    const availableCoupons = await listPublicCouponsForProduct(
      product.id,
      product.vendorProfileId
    );

    return { ...product, availableCoupons };
  }

  async listVendors(filters?: { industry?: IndustryType }) {
    const vendors = await this.vendorProfileRepository.listPublic(
      filters?.industry ? { industryType: filters.industry } : undefined
    );

    return vendors.map((vendor) => ({
      id: vendor.id,
      storeName: vendor.storeName!,
      storeSlug: vendor.storeSlug!,
      logoUrl: vendor.logoUrl,
      description: vendor.description,
      industryType: vendor.industryType,
      productCount: vendor._count.products,
      approvedAt: vendor.approvedAt?.toISOString() ?? null,
    }));
  }

  async getVendorStore(storeSlug: string) {
    const vendor = await this.vendorProfileRepository.findByStoreSlug(storeSlug);

    if (!vendor || vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor store not found",
        statusCode: 404,
      });
    }

    const { items: products } = await this.productRepository.listPublic({
      vendorStoreSlugs: [storeSlug],
    });

    const couponMap = await listPublicCouponsForProducts(
      products.map((product) => ({
        productId: product.id,
        vendorProfileId: product.vendorProfileId,
      }))
    );

    const offers = await listPublicStorefrontOffers(storeSlug);

    return {
      vendor,
      products: products.map((product) => ({
        ...product,
        availableCoupons: couponMap.get(product.id) ?? [],
      })),
      promoBanners: offers?.banners ?? [],
      publicCoupons: offers?.coupons ?? [],
    };
  }
}
