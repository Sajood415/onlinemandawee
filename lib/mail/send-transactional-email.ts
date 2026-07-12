import nodemailer from "nodemailer";

import { env } from "@/config/env.shared";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const host = env.SMTP_HOST;
  if (!host) {
    if (env.NODE_ENV === "production") {
      throw new AppError({
        code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: "Email is not configured (SMTP_HOST)",
        statusCode: 503,
      });
    }
    return;
  }

  const port = env.SMTP_PORT ?? 587;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  const from = env.SMTP_FROM ?? "Online Mandawee <noreply@onlinemandawee.com>";

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {}),
  });
}
