import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductVariantRepository } from "@/repositories/product-variant.repository";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseParams } from "@/validators/request";

const variantRepository = new ProductVariantRepository();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await variantRepository.listByProduct(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
