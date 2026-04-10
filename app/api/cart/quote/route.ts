import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CheckoutService } from "@/services/checkout.service";
import { cartQuoteSchema } from "@/validators/cart.validator";
import { parseBody } from "@/validators/request";

const checkoutService = new CheckoutService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, cartQuoteSchema);
    const result = await checkoutService.quote(context.auth, input);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
