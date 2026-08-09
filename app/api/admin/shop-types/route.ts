import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ShopTypeService } from "@/services/shop-type.service";
import { createShopTypeSchema } from "@/validators/shop-type.validator";
import { parseBody } from "@/validators/request";

const service = new ShopTypeService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await service.listForAdmin();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, createShopTypeSchema);
    const result = await service.create(context.auth, input);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
