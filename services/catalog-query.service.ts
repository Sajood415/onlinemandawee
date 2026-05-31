import {
  listPublicCouponsForProduct,
  listPublicStorefrontOffers,
} from "@/lib/checkout/list-public-vendor-offers";
import { isMongoObjectId } from "@/lib/db/object-id";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
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

  listProducts(filters: {
    category?: string;
    vendor?: string;
    search?: string;
  }) {
    return this.productRepository.listPublic({
      categorySlug: filters.category,
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
