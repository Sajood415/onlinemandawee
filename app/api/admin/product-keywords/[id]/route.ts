import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductBlockedKeywordService } from "@/services/product-blocked-keyword.service";
import { productBlockedKeywordIdParamsSchema } from "@/validators/product-blocked-keyword.validator";
import { parseParams } from "@/validators/request";

const service = new ProductBlockedKeywordService();

export const DELETE = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(
      await context.params,
      productBlockedKeywordIdParamsSchema
    );
    const result = await service.delete(context.auth, params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
