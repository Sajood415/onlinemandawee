import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProductVariantService } from "@/services/vendor-product-variant.service";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseBody, parseParams } from "@/validators/request";

const variantService = new VendorProductVariantService();

const createVariantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  priceAmount: z.number().int().positive().max(100_000_000).nullable().optional(),
  stockQty: z.number().int().min(0).max(1_000_000),
  sku: z.string().trim().max(100).nullable().optional(),
});

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await variantService.list(context.auth, params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const body = await parseBody(request, createVariantSchema);
    const result = await variantService.create(context.auth, params.id, body);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
