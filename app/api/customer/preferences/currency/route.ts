import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { UserRepository } from "@/repositories/user.repository";
import { updatePreferredCurrencySchema } from "@/validators/currency.validator";

const userRepository = new UserRepository();

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const body = await request.json();
    const parsed = updatePreferredCurrencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid currency" } },
        { status: 400 }
      );
    }

    const user = await userRepository.updateProfile(context.auth.id, {
      preferredCurrency: parsed.data.currency,
    });

    return NextResponse.json(
      {
        data: {
          preferredCurrency: user.preferredCurrency,
        },
      },
      { status: 200 }
    );
  })
);
