import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductReviewService } from "@/services/product-review.service";
import {
  reviewIdParamsSchema,
  setProductReviewVisibilitySchema,
} from "@/validators/product-review.validator";
import { parseBody, parseParams } from "@/validators/request";

const productReviewService = new ProductReviewService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, reviewIdParamsSchema);
    const input = await parseBody(request, setProductReviewVisibilitySchema);
    const result = await productReviewService.setVisibilityForAdmin(params.id, input.isHidden);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, reviewIdParamsSchema);
    const result = await productReviewService.deleteForAdmin(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
