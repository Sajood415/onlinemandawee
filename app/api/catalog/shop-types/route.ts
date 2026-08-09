import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { ShopTypeService } from "@/services/shop-type.service";

const service = new ShopTypeService();

export const GET = withErrorHandling(async (request) => {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const result = await service.listActivePublic(locale);
  return NextResponse.json({ data: result }, { status: 200 });
});
