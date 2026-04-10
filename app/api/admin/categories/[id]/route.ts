import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminCategoryService } from "@/services/admin-category.service";
import {
  categoryIdParamsSchema,
  updateCategorySchema,
} from "@/validators/catalog.validator";
import { parseBody, parseParams } from "@/validators/request";

const adminCategoryService = new AdminCategoryService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, categoryIdParamsSchema);
    const input = await parseBody(request, updateCategorySchema);
    const result = await adminCategoryService.update(
      params.id,
      input,
      context.auth
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
