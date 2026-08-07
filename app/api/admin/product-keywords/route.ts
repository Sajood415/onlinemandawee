import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { ProductBlockedKeywordService } from "@/services/product-blocked-keyword.service";
import { createProductBlockedKeywordSchema } from "@/validators/product-blocked-keyword.validator";
import { parseBody } from "@/validators/request";

const service = new ProductBlockedKeywordService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await service.list();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, createProductBlockedKeywordSchema);
    const result = await service.create(context.auth, input.word);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
