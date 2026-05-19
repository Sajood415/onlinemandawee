import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProductVariantService } from "@/services/vendor-product-variant.service";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseBody, parseParams } from "@/validators/request";

const variantService = new VendorProductVariantService();

const variantParamsSchema = productIdParamsSchema.extend({
  variantId: z.string().min(1),
});

const updateVariantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  priceAmount: z
    .union([z.number().int().positive().max(100_000_000), z.null()])
    .optional(),
  stockQty: z.number().int().min(0).max(1_000_000),
  sku: z.union([z.string().trim().max(100), z.null()]).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, variantParamsSchema);
    const body = await parseBody(request, updateVariantSchema);
    const result = await variantService.update(
      context.auth,
      params.id,
      params.variantId,
      body
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const params = parseParams(await context.params, variantParamsSchema);
    await variantService.delete(context.auth, params.id, params.variantId);
    return NextResponse.json({ data: null }, { status: 200 });
  })
);
