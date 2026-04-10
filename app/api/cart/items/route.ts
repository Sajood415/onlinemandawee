import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CartService } from "@/services/cart.service";
import { addCartItemSchema } from "@/validators/cart.validator";
import { parseBody } from "@/validators/request";

const cartService = new CartService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, addCartItemSchema);
    const result = await cartService.addItem(context.auth, input);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
