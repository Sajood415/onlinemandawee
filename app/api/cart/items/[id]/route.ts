import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CartService } from "@/services/cart.service";
import {
  cartItemIdParamsSchema,
  updateCartItemSchema,
} from "@/validators/cart.validator";
import { parseBody, parseParams } from "@/validators/request";

const cartService = new CartService();

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const params = parseParams(await context.params, cartItemIdParamsSchema);
    const input = await parseBody(request, updateCartItemSchema);
    const result = await cartService.updateItem(
      context.auth,
      params.id,
      input.quantity
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const params = parseParams(await context.params, cartItemIdParamsSchema);
    const result = await cartService.removeItem(context.auth, params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
