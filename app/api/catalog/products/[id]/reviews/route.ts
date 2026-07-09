import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductReviewService } from "@/services/product-review.service";
import {
  createProductReviewSchema,
  productIdParamsSchema,
  publicProductReviewListQuerySchema,
} from "@/validators/product-review.validator";
import { parseBody, parseParams, parseQuery } from "@/validators/request";

const productReviewService = new ProductReviewService();

export const GET = withErrorHandling(async (request, context) => {
  const params = parseParams(await context.params, productIdParamsSchema);
  const query = parseQuery(request, publicProductReviewListQuerySchema);
  const result = await productReviewService.listPublicForProduct(params.id, {
    page: query.page,
    pageSize: query.pageSize,
  });

  return NextResponse.json({ data: result }, { status: 200 });
});

export const POST = withErrorHandling(
  withRbac(["CUSTOMER", "VENDOR", "ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const input = await parseBody(request, createProductReviewSchema);
    const result = await productReviewService.createForUser(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
