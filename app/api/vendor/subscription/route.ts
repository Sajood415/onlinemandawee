import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { MembershipBillingService } from "@/services/membership-billing.service";

const vendorProfileRepository = new VendorProfileRepository();
const membershipBillingService = new MembershipBillingService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const vendor = await vendorProfileRepository.findByUserId(context.auth.id);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    const status = await membershipBillingService.getVendorSubscriptionStatus(
      vendor.id
    );

    return NextResponse.json({ data: status }, { status: 200 });
  })
);
