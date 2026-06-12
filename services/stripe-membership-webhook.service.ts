import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { syncVendorBillingAccess } from "@/lib/membership/billing-access";
import { durationFromNow } from "@/lib/utils/duration";
import { sha256 } from "@/lib/utils/crypto";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import {
  stripeInvoicePaymentIntentId,
  stripeInvoiceSubscriptionId,
} from "@/lib/stripe/invoice-fields";
import { VendorSubscriptionService } from "@/services/vendor-subscription.service";

type StripeEventType =
  | "invoice.paid"
  | "invoice.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

export class StripeMembershipWebhookService {
  constructor(
    private readonly idempotencyKeyRepository = new IdempotencyKeyRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly vendorSubscriptionService = new VendorSubscriptionService()
  ) {}

  async process(event: Stripe.Event) {
    const supportedTypes = new Set<StripeEventType>([
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ]);

    if (!supportedTypes.has(event.type as StripeEventType)) {
      return { ignored: true, eventId: event.id, eventType: event.type };
    }

    const idempotencyKey = `stripe:membership:${event.id}`;
    const requestHash = sha256(
      JSON.stringify({
        eventId: event.id,
        type: event.type,
        created: event.created,
      })
    );
    const existing = await this.idempotencyKeyRepository.findByKey(idempotencyKey);
    if (existing?.status === "SUCCEEDED") {
      return existing.responseBody as Record<string, unknown>;
    }
    if (existing?.status === "IN_PROGRESS") {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Membership webhook event is already being processed",
        statusCode: 409,
      });
    }

    if (!existing) {
      try {
        await this.idempotencyKeyRepository.createInProgress({
          key: idempotencyKey,
          scope: "stripe_membership_webhook",
          requestHash,
          expiresAt: durationFromNow("7d"),
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        const raced = await this.idempotencyKeyRepository.findByKey(idempotencyKey);
        if (raced?.status === "SUCCEEDED") {
          return raced.responseBody as Record<string, unknown>;
        }
        throw new AppError({
          code: ERROR_CODE.CONFLICT,
          message: "Membership webhook event is already being processed",
          statusCode: 409,
        });
      }
    }

    try {
      const response = await this.dispatch(event);
      await this.idempotencyKeyRepository.markSucceeded({
        key: idempotencyKey,
        responseCode: 200,
        responseBody: response,
      });
      return response;
    } catch (error) {
      const body =
        error instanceof AppError
          ? { error: { code: error.code, message: error.message } }
          : {
              error: {
                code: ERROR_CODE.INTERNAL_SERVER_ERROR,
                message: "Membership webhook processing failed",
              },
            };
      await this.idempotencyKeyRepository.markFailed({
        key: idempotencyKey,
        responseCode: error instanceof AppError ? error.statusCode : 500,
        responseBody: body,
      });
      throw error;
    }
  }

  private async dispatch(event: Stripe.Event) {
    switch (event.type) {
      case "invoice.paid":
        return this.handleInvoicePaid(event);
      case "invoice.payment_failed":
        return this.handleInvoicePaymentFailed(event);
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return this.handleSubscriptionEvent(event);
      default:
        return { ignored: true, eventId: event.id, eventType: event.type };
    }
  }

  private async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const vendor = await this.resolveVendorFromInvoice(invoice);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor for Stripe invoice was not found",
        statusCode: 404,
      });
    }

    const period = this.resolveInvoicePeriod(invoice);
    await this.membershipInvoiceRepository.upsertByStripeInvoiceId({
      stripeInvoiceId: invoice.id,
      vendorProfileId: vendor.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      dueAt: this.fromUnix(invoice.due_date) ?? period.periodEnd,
      amount: invoice.amount_paid || invoice.amount_due || 0,
      currency: (invoice.currency || env.MEMBERSHIP_INVOICE_CURRENCY).toUpperCase(),
      status: "PAID",
      paidAt: this.fromUnix(invoice.status_transitions?.paid_at) ?? new Date(),
      stripeCustomerId: this.idOrNull(invoice.customer),
      stripeSubscriptionId: stripeInvoiceSubscriptionId(invoice),
      stripePaymentId: stripeInvoicePaymentIntentId(invoice),
      stripeEventId: event.id,
      attemptedAt: this.fromUnix(invoice.status_transitions?.finalized_at),
      invoiceHostedUrl: invoice.hosted_invoice_url ?? null,
      failureCode: null,
      failureReason: null,
    });

    await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendor.id,
      onboardingStep: vendor.onboardingStep,
      subscriptionStatus: "ACTIVE",
      subscriptionFailedAt: null,
      subscriptionGracePeriodEndsAt: null,
      subscriptionFailedPaymentCount: 0,
      subscriptionLastPaymentAt: new Date(),
      subscriptionNextBillingAt: this.fromUnix(invoice.next_payment_attempt),
      stripeCustomerId: this.idOrNull(invoice.customer),
      stripeSubscriptionId: stripeInvoiceSubscriptionId(invoice),
    });

    const access = await syncVendorBillingAccess(vendor.id);
    if (access.action === "reactivated") {
      await this.userRepository.updateStatus(vendor.userId, "ACTIVE");
    }

    return {
      eventId: event.id,
      eventType: event.type,
      vendorProfileId: vendor.id,
      invoiceId: invoice.id,
      status: "PAID",
      accessSync: access.action,
    };
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const vendor = await this.resolveVendorFromInvoice(invoice);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor for Stripe invoice was not found",
        statusCode: 404,
      });
    }

    const existingInvoice = await this.membershipInvoiceRepository.findByStripeInvoiceId(
      invoice.id
    );
    if (existingInvoice?.status === "PAID") {
      return {
        eventId: event.id,
        eventType: event.type,
        vendorProfileId: vendor.id,
        invoiceId: invoice.id,
        skipped: true,
        reason: "invoice_already_paid",
      };
    }

    const period = this.resolveInvoicePeriod(invoice);
    await this.membershipInvoiceRepository.upsertByStripeInvoiceId({
      stripeInvoiceId: invoice.id,
      vendorProfileId: vendor.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      dueAt: this.fromUnix(invoice.due_date) ?? period.periodEnd,
      amount: invoice.amount_due || 0,
      currency: (invoice.currency || env.MEMBERSHIP_INVOICE_CURRENCY).toUpperCase(),
      status: "PENDING",
      stripeCustomerId: this.idOrNull(invoice.customer),
      stripeSubscriptionId: stripeInvoiceSubscriptionId(invoice),
      stripePaymentId: stripeInvoicePaymentIntentId(invoice),
      stripeEventId: event.id,
      failureCode: invoice.last_finalization_error?.code ?? null,
      failureReason: invoice.last_finalization_error?.message ?? null,
      attemptedAt: new Date(),
      invoiceHostedUrl: invoice.hosted_invoice_url ?? null,
    });

    const now = new Date();
    const existingGrace = vendor.subscriptionGracePeriodEndsAt;
    const graceEndsAt = existingGrace ?? this.addDays(now, env.MEMBERSHIP_GRACE_DAYS);
    const shouldSuspend = now >= graceEndsAt;

    await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendor.id,
      onboardingStep: vendor.onboardingStep,
      subscriptionStatus: shouldSuspend ? "SUSPENDED" : "FAILED",
      subscriptionFailedAt: vendor.subscriptionFailedAt ?? now,
      subscriptionGracePeriodEndsAt: graceEndsAt,
      subscriptionFailedPaymentCount: (vendor.subscriptionFailedPaymentCount ?? 0) + 1,
      stripeCustomerId: this.idOrNull(invoice.customer),
      stripeSubscriptionId: stripeInvoiceSubscriptionId(invoice),
    });

    const access = await syncVendorBillingAccess(vendor.id);

    return {
      eventId: event.id,
      eventType: event.type,
      vendorProfileId: vendor.id,
      invoiceId: invoice.id,
      gracePeriodEndsAt: graceEndsAt.toISOString(),
      suspended: access.action === "suspended" || shouldSuspend,
      accessSync: access.action,
    };
  }

  private async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    let vendor =
      (await this.vendorProfileRepository.findByStripeSubscriptionId(
        subscription.id
      )) ??
      (await this.vendorProfileRepository.findByStripeCustomerId(
        this.idOrNull(subscription.customer) ?? ""
      ));

    if (!vendor && subscription.metadata.vendorProfileId) {
      vendor = await this.vendorProfileRepository.findById(
        subscription.metadata.vendorProfileId
      );
    }

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor for Stripe subscription was not found",
        statusCode: 404,
      });
    }

    await this.vendorSubscriptionService.syncVendorFromStripeSubscription(
      vendor.id,
      subscription
    );

    const access = await syncVendorBillingAccess(vendor.id);

    return {
      eventId: event.id,
      eventType: event.type,
      vendorProfileId: vendor.id,
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      accessSync: access.action,
    };
  }

  private async resolveVendorFromInvoice(invoice: Stripe.Invoice) {
    const customerId = this.idOrNull(invoice.customer);
    const subscriptionId = stripeInvoiceSubscriptionId(invoice);
    const customerVendor = customerId
      ? await this.vendorProfileRepository.findByStripeCustomerId(customerId)
      : null;
    if (customerVendor) {
      return customerVendor;
    }
    if (subscriptionId) {
      return this.vendorProfileRepository.findByStripeSubscriptionId(subscriptionId);
    }
    return null;
  }

  private resolveInvoicePeriod(invoice: Stripe.Invoice) {
    const line = invoice.lines.data[0];
    if (line?.period?.start && line?.period?.end) {
      return {
        periodStart: new Date(line.period.start * 1000),
        periodEnd: new Date(line.period.end * 1000),
      };
    }
    const createdAt = this.fromUnix(invoice.created) ?? new Date();
    const periodEnd = new Date(createdAt);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    return {
      periodStart: createdAt,
      periodEnd,
    };
  }

  private fromUnix(value?: number | null) {
    if (!value) return null;
    return new Date(value * 1000);
  }

  private idOrNull(
    value:
      | string
      | Stripe.Customer
      | Stripe.Subscription
      | Stripe.PaymentIntent
      | Stripe.DeletedCustomer
      | null
      | undefined
  ) {
    if (!value) return null;
    if (typeof value === "string") return value;
    return value.id;
  }

  private addDays(value: Date, days: number) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    );
  }
}
