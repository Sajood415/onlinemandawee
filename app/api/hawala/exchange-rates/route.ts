import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { HawalaExchangeRateService } from "@/services/hawala-exchange-rate.service";

const hawalaExchangeRateService = new HawalaExchangeRateService();

export const GET = withErrorHandling(async () => {
  const rates = await hawalaExchangeRateService.list();
  return NextResponse.json({ data: rates }, { status: 200 });
});
