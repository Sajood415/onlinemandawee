import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { HawalaExchangeRateService } from "@/services/hawala-exchange-rate.service";
import { upsertHawalaExchangeRatesSchema } from "@/validators/hawala.validator";
import { parseBody } from "@/validators/request";

const hawalaExchangeRateService = new HawalaExchangeRateService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await hawalaExchangeRateService.list();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, upsertHawalaExchangeRatesSchema);
    const result = await hawalaExchangeRateService.updateMany(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
