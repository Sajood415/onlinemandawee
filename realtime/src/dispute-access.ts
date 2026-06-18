import { prisma } from "./prisma.js";
import type { SocketAuthUser } from "./auth.js";

export async function canAccessDisputeCase(
  auth: SocketAuthUser,
  refundCaseId: string
): Promise<boolean> {
  const refundCase = await prisma.refundCase.findUnique({
    where: { id: refundCaseId },
    include: {
      orderItem: {
        include: {
          orderVendor: {
            include: {
              vendorProfile: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!refundCase) {
    return false;
  }

  const vendorUserId = refundCase.orderItem.orderVendor.vendorProfile.user.id;
  const isCustomer = refundCase.customerUserId === auth.id;
  const isVendor = vendorUserId === auth.id;
  const isAdmin = auth.role === "ADMIN";

  return isCustomer || isVendor || isAdmin;
}

export function disputeRoomName(refundCaseId: string) {
  return `dispute:${refundCaseId}`;
}
