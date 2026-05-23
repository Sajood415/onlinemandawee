import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CustomerAddressRepository } from "@/repositories/customer-address.repository";

import type { z } from "zod";
import type { createCustomerAddressSchema, updateCustomerAddressSchema } from "@/validators/customer.validator";

type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressSchema>;
type UpdateCustomerAddressInput = z.infer<typeof updateCustomerAddressSchema>;

export class CustomerAddressService {
  constructor(
    private readonly customerAddressRepository = new CustomerAddressRepository()
  ) {}

  async listForCustomer(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    const addresses = await this.customerAddressRepository.listByUserId(auth.id);
    return addresses.map((address) => this.serializeAddress(address));
  }

  async createForCustomer(auth: AuthenticatedUser, input: CreateCustomerAddressInput) {
    this.assertActiveCustomer(auth);

    const existing = await this.customerAddressRepository.listByUserId(auth.id);
    const isDefault = input.isDefault ?? existing.length === 0;

    if (isDefault) {
      await this.customerAddressRepository.unsetDefaultsForUser(auth.id);
    }

    const address = await this.customerAddressRepository.create({
      userId: auth.id,
      label: input.label?.trim() || null,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      isDefault,
    });

    return this.serializeAddress(address);
  }

  async updateForCustomer(
    auth: AuthenticatedUser,
    addressId: string,
    input: UpdateCustomerAddressInput
  ) {
    this.assertActiveCustomer(auth);

    const existingAddress = await this.customerAddressRepository.findById(addressId);

    if (!existingAddress || existingAddress.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
      });
    }

    const isDefault = input.isDefault ?? existingAddress.isDefault;

    if (isDefault) {
      await this.customerAddressRepository.unsetDefaultsForUser(auth.id);
    }

    const address = await this.customerAddressRepository.update({
      id: addressId,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      isDefault,
    });

    return this.serializeAddress(address);
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.role !== "CUSTOMER") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only customers can manage addresses",
        statusCode: 403,
      });
    }

    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Customer account is not active",
        statusCode: 403,
      });
    }
  }

  private serializeAddress(address: {
    id: string;
    label: string | null;
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    isDefault: boolean;
  }) {
    return {
      id: address.id,
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      city: address.city,
      country: address.country,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    };
  }
}
