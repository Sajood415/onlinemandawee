import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { slugify } from "../lib/utils/slug";

const prisma = new PrismaClient();

const BABY_CARE_CATEGORY_SLUG = "baby-care";
const SEED_VENDOR_EMAIL = "seed-baby-care-vendor@mandawee.local";

const BABY_CARE_PRODUCTS = [
  {
    name: "Gentle Baby Shampoo",
    description:
      "Tear-free baby shampoo with mild cleansers and chamomile extract. Suitable for daily use on sensitive scalp and skin.",
    sku: "BC-SHAMPOO-250",
    priceAmount: 899,
    stockQty: 120,
    images: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Premium Baby Diapers Size 3",
    description:
      "Ultra-soft absorbent diapers with stretchy sides and wetness indicator. Pack of 48 for babies 6–10 kg.",
    sku: "BC-DIAPERS-S3",
    priceAmount: 2499,
    stockQty: 80,
    images: [
      "https://images.unsplash.com/photo-1584515933487-7798242912f7?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Sensitive Skin Baby Wipes",
    description:
      "Fragrance-free baby wipes with aloe vera. Dermatologist tested, 72 wipes per pack.",
    sku: "BC-WIPES-72",
    priceAmount: 649,
    stockQty: 200,
    images: [
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Moisturizing Baby Lotion",
    description:
      "Lightweight daily lotion with shea butter and vitamin E. Keeps baby skin soft and hydrated after bath time.",
    sku: "BC-LOTION-500",
    priceAmount: 1199,
    stockQty: 95,
    images: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Infant Formula Stage 1",
    description:
      "Nutritious stage 1 infant formula with iron and DHA. For newborns up to 6 months, 400 g tin.",
    sku: "BC-FORMULA-S1",
    priceAmount: 1899,
    stockQty: 60,
    images: [
      "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Organic Cotton Onesie Set",
    description:
      "Soft breathable onesie set in neutral colors. 100% organic cotton, snap buttons, machine washable.",
    sku: "BC-ONESIE-3PK",
    priceAmount: 1599,
    stockQty: 45,
    images: [
      "https://images.unsplash.com/photo-1515488042361-ee00e926ddd2?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Silicone Teething Ring",
    description:
      "BPA-free silicone teething ring with textured surfaces to soothe sore gums. Easy-grip design for little hands.",
    sku: "BC-TEETHER-01",
    priceAmount: 799,
    stockQty: 110,
    images: [
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    name: "Knitted Baby Blanket",
    description:
      "Cozy lightweight blanket for crib and stroller. Hypoallergenic yarn, gentle on delicate skin.",
    sku: "BC-BLANKET-01",
    priceAmount: 2199,
    stockQty: 35,
    images: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
    ],
  },
] as const;

async function ensureBabyCareCategory() {
  const existing = await prisma.category.findUnique({
    where: { slug: BABY_CARE_CATEGORY_SLUG },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: {
        name: "Baby Care",
        sortOrder: 9,
        isActive: true,
        parentId: null,
      },
    });
  }

  return prisma.category.create({
      data: {
        name: "Baby Care",
        slug: BABY_CARE_CATEGORY_SLUG,
        sortOrder: 9,
        isActive: true,
        parentId: null,
      },
    });
}

async function resolveSeedVendor() {
  const existingUser = await prisma.user.findUnique({
    where: { email: SEED_VENDOR_EMAIL },
    include: { vendorProfile: true },
  });

  if (existingUser?.vendorProfile) {
    if (existingUser.vendorProfile.status !== "ACTIVE") {
      return prisma.vendorProfile.update({
        where: { id: existingUser.vendorProfile.id },
        data: {
          status: "ACTIVE",
          storeName: existingUser.vendorProfile.storeName ?? "Little Ones Market",
          storeSlug: existingUser.vendorProfile.storeSlug ?? "little-ones-market",
          approvedAt: existingUser.vendorProfile.approvedAt ?? new Date(),
        },
      });
    }
    return existingUser.vendorProfile;
  }

  const activeVendor = await prisma.vendorProfile.findFirst({
    where: {
      status: "ACTIVE",
      storeSlug: { not: null },
      NOT: { storeSlug: { startsWith: "_draft_" } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (activeVendor) {
    console.log(`Using existing vendor: ${activeVendor.storeName ?? activeVendor.storeSlug}`);
    return activeVendor;
  }

  const passwordHash = await hash("SeedVendor123!", 12);
  const user = await prisma.user.create({
    data: {
      fullName: "Baby Care Demo Vendor",
      email: SEED_VENDOR_EMAIL,
      phone: "+93700000999",
      passwordHash,
      role: "VENDOR",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  return prisma.vendorProfile.create({
    data: {
      userId: user.id,
      storeName: "Little Ones Market",
      storeSlug: "little-ones-market",
      businessType: "REGISTERED_BUSINESS",
      industryType: "HEALTH_BEAUTY",
      status: "ACTIVE",
      onboardingStep: "SUBMITTED",
      approvedAt: new Date(),
      subscriptionStatus: "ACTIVE",
    },
  });
}

async function main() {
  const category = await ensureBabyCareCategory();
  const vendor = await resolveSeedVendor();

  console.log(`Category: ${category.name} (${category.slug})`);
  console.log(`Vendor: ${vendor.storeName ?? vendor.storeSlug}`);

  for (const product of BABY_CARE_PRODUCTS) {
    const slug = slugify(product.name);
    const existing = await prisma.product.findUnique({
      where: {
        vendorProfileId_slug: {
          vendorProfileId: vendor.id,
          slug,
        },
      },
    });

    const data = {
      categoryId: category.id,
      name: product.name,
      slug,
      description: product.description,
      images: [...product.images],
      sku: product.sku,
      currency: "USD",
      priceAmount: product.priceAmount,
      stockQty: product.stockQty,
      approvalStatus: "APPROVED" as const,
      isActive: true,
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data,
      });
      console.log(`Updated: ${product.name}`);
      continue;
    }

    await prisma.product.create({
      data: {
        vendorProfileId: vendor.id,
        ...data,
      },
    });
    console.log(`Created: ${product.name}`);
  }

  console.log(`Done. Seeded ${BABY_CARE_PRODUCTS.length} baby care products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
