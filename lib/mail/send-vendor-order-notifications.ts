import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  buildVendorNewOrderEmail,
  type OrderEmailContext,
} from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

type VendorGroupInput = {
  vendorProfileId: string;
  grandTotalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceAmount: number;
    currency: string;
  }>;
};

export async function sendVendorOrderNotifications(input: {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  currency: string;
  paymentMethod: "cod" | "card";
  paymentStatus: "PAID" | "UNPAID";
  shippingAddress: OrderEmailContext["shippingAddress"];
  vendorGroups: VendorGroupInput[];
}) {
  if (input.vendorGroups.length === 0) return;

  try {
    const vendors = await prisma.vendorProfile.findMany({
      where: { id: { in: input.vendorGroups.map((group) => group.vendorProfileId) } },
      include: { user: { select: { email: true, fullName: true } } },
    });
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

    await Promise.allSettled(
      input.vendorGroups.map(async (group) => {
        const vendor = vendorById.get(group.vendorProfileId);
        if (!vendor?.user.email) return;

        const email = buildVendorNewOrderEmail({
          vendorName: vendor.user.fullName,
          storeName: vendor.storeName ?? "your store",
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          items: group.items,
          vendorTotalAmount: group.grandTotalAmount,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          shippingAddress: input.shippingAddress,
        });

        await sendTransactionalEmail({ to: vendor.user.email, ...email });
      })
    );
  } catch {
    // Order is already saved; do not fail the request if mail fails.
  }
}
