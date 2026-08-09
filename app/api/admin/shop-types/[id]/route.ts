import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ShopTypeService } from "@/services/shop-type.service";
import {
  shopTypeIdParamsSchema,
  updateShopTypeSchema,
} from "@/validators/shop-type.validator";
import { parseBody, parseParams } from "@/validators/request";

const service = new ShopTypeService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const { id } = parseParams(await context.params, shopTypeIdParamsSchema);
    const input = await parseBody(request, updateShopTypeSchema);
    const result = await service.update(context.auth, id, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const { id } = parseParams(await context.params, shopTypeIdParamsSchema);
    const result = await service.delete(context.auth, id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
