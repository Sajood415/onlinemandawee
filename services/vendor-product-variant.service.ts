import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { ProductVariantRepository } from "@/repositories/product-variant.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class VendorProductVariantService {
  constructor(
    private readonly variantRepository = new ProductVariantRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository()
  ) {}

  async list(auth: AuthenticatedUser, productId: string) {
    const vendor = await this.requireActiveVendor(auth.id);
    await this.requireOwnProduct(vendor.id, productId);
    return this.variantRepository.listByProduct(productId);
  }

  async create(
    auth: AuthenticatedUser,
    productId: string,
    input: {
      name: string;
      priceAmount?: number | null;
      stockQty: number;
      sku?: string | null;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    await this.requireOwnProduct(vendor.id, productId);

    return this.variantRepository.create({
      productId,
      name: input.name,
      priceAmount: input.priceAmount ?? null,
      stockQty: input.stockQty,
      sku: input.sku ?? null,
    });
  }

  async update(
    auth: AuthenticatedUser,
    productId: string,
    variantId: string,
    input: {
      name: string;
      priceAmount?: number | null;
      stockQty: number;
      sku?: string | null;
      isActive?: boolean;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    await this.requireOwnProduct(vendor.id, productId);
    await this.requireOwnVariant(productId, variantId);

    return this.variantRepository.update({
      id: variantId,
      name: input.name,
      priceAmount: input.priceAmount ?? null,
      stockQty: input.stockQty,
      sku: input.sku ?? null,
      isActive: input.isActive,
    });
  }

  async delete(auth: AuthenticatedUser, productId: string, variantId: string) {
    const vendor = await this.requireActiveVendor(auth.id);
    await this.requireOwnProduct(vendor.id, productId);
    await this.requireOwnVariant(productId, variantId);
    return this.variantRepository.delete(variantId);
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({ code: ERROR_CODE.NOT_FOUND, message: "Vendor profile not found", statusCode: 404 });
    }
    if (vendor.status !== "ACTIVE") {
      throw new AppError({ code: ERROR_CODE.FORBIDDEN, message: "Only active vendors can manage variants", statusCode: 403 });
    }
    return vendor;
  }

  private async requireOwnProduct(vendorProfileId: string, productId: string) {
    const product = await this.productRepository.findByVendorAndId(vendorProfileId, productId);
    if (!product) {
      throw new AppError({ code: ERROR_CODE.NOT_FOUND, message: "Product not found", statusCode: 404 });
    }
    return product;
  }

  private async requireOwnVariant(productId: string, variantId: string) {
    const variant = await this.variantRepository.findById(variantId);
    if (!variant || variant.productId !== productId) {
      throw new AppError({ code: ERROR_CODE.NOT_FOUND, message: "Variant not found", statusCode: 404 });
    }
    return variant;
  }
}
