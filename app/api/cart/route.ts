import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CartService } from "@/services/cart.service";
import { cartCurrencySchema } from "@/validators/cart.validator";
import { parseBody } from "@/validators/request";

const cartService = new CartService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const result = await cartService.getCart(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, cartCurrencySchema);
    const result = await cartService.updateCartCurrency(
      context.auth,
      input.currency
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
