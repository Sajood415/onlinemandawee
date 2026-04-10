import { prisma } from "@/lib/db/prisma";

export class VendorAddressRepository {
  upsert(input: {
    vendorProfileId: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    proofOfAddressUrl?: string;
  }) {
    return prisma.vendorAddress.upsert({
      where: {
        vendorProfileId: input.vendorProfileId,
      },
      update: {
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
        proofOfAddressUrl: input.proofOfAddressUrl ?? null,
      },
      create: {
        vendorProfileId: input.vendorProfileId,
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
        proofOfAddressUrl: input.proofOfAddressUrl ?? null,
      },
    });
  }
}
