import "server-only";

import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/utils/crypto";

export async function generateUniqueGuestTrackingToken() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateOpaqueToken().replace(/-/g, "");
    const existing = await prisma.order.findUnique({
      where: { guestTrackingToken: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Could not generate unique guest tracking token");
}
