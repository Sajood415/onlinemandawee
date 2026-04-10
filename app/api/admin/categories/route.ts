import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminCategoryService } from "@/services/admin-category.service";
import { createCategorySchema } from "@/validators/catalog.validator";
import { parseBody } from "@/validators/request";

const adminCategoryService = new AdminCategoryService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await adminCategoryService.list();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, createCategorySchema);
    const result = await adminCategoryService.create(input, context.auth);

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
