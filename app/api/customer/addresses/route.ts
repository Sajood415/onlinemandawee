import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CustomerAddressService } from "@/services/customer-address.service";
import { createCustomerAddressSchema } from "@/validators/customer.validator";
import { parseBody } from "@/validators/request";

const customerAddressService = new CustomerAddressService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const addresses = await customerAddressService.listForCustomer(context.auth);
    return NextResponse.json({ data: addresses }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, createCustomerAddressSchema);
    const address = await customerAddressService.createForCustomer(context.auth, input);
    return NextResponse.json({ data: address }, { status: 201 });
  })
);
