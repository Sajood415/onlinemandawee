import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CustomerAddressService } from "@/services/customer-address.service";
import {
  customerAddressIdParamsSchema,
  updateCustomerAddressSchema,
} from "@/validators/customer.validator";
import { parseBody, parseParams } from "@/validators/request";

const customerAddressService = new CustomerAddressService();

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const params = parseParams(await context.params, customerAddressIdParamsSchema);
    const input = await parseBody(request, updateCustomerAddressSchema);
    const address = await customerAddressService.updateForCustomer(
      context.auth,
      params.id,
      input
    );
    return NextResponse.json({ data: address }, { status: 200 });
  })
);
