import { getDepartmentImage } from "@/lib/categories/storefront-departments";
import {
  listPublicCouponsForProduct,
  listPublicStorefrontOffers,
} from "@/lib/checkout/list-public-vendor-offers";
import { isMongoObjectId } from "@/lib/db/object-id";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import { CategoryRepository } from "@/repositories/category.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class CatalogQueryService {
  constructor(
    private readonly categoryRepository = new CategoryRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository()
  ) {}

  listCategories() {
    return this.categoryRepository.listActive();
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

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      image: getDepartmentImage(category.slug),
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : null,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        sortOrder: child.sortOrder,
        image: getDepartmentImage(child.slug),
      })),
    };
  }

  async listProducts(filters: {
    category?: string;
    vendor?: string;
    search?: string;
  }) {
    let categoryIds: string[] | undefined;

    if (filters.category) {
      const normalizedCategory = filters.category === "baby" ? "baby-care" : filters.category;
      const category = await this.categoryRepository.findBySlug(normalizedCategory);

      if (!category || !category.isActive) {
        return [];
      }

      categoryIds = await this.categoryRepository.listActiveDescendantIds(category.id);
    }

    return this.productRepository.listPublic({
      categoryIds,
      vendorStoreSlug: filters.vendor,
      search: filters.search,
    });
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

    const products = await this.productRepository.listPublic({
      vendorStoreSlug: storeSlug,
    });

    const offers = await listPublicStorefrontOffers(storeSlug);

    return {
      vendor,
      products,
      promoBanners: offers?.banners ?? [],
      publicCoupons: offers?.coupons ?? [],
    };
  }
}
