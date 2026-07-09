import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductReviewService } from "@/services/product-review.service";
import { adminProductReviewListQuerySchema } from "@/validators/product-review.validator";
import { parseQuery } from "@/validators/request";

const productReviewService = new ProductReviewService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminProductReviewListQuerySchema);
    const result = await productReviewService.listForAdmin(query);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
