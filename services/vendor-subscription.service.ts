import type Stripe from "stripe";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { syncVendorBillingAccess } from "@/lib/membership/billing-access";
import { stripeSubscriptionPeriod } from "@/lib/stripe/subscription-fields";
import { getStripeServerClient } from "@/lib/stripe/server";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type VendorProfileWithUser = Awaited<
  ReturnType<VendorProfileRepository["findById"]>
>;

export class VendorSubscriptionService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository()
  ) {}

  async createSetupIntentForVendorUser(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    if (vendor.sellerType === "PLATFORM") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "PLATFORM vendors are exempt from membership billing",
        statusCode: 400,
      });
    }

    const customer = await this.ensureStripeCustomer(vendor);
    const stripe = getStripeServerClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        vendorProfileId: vendor.id,
        purpose: "membership_subscription",
      },
    });

    await this.ensureSubscriptionForVendor(vendor.id);

    return {
      customerId: customer.id,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
    };
  }

  async finalizeSetupIntentForVendorUser(userId: string, setupIntentId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    if (vendor.sellerType === "PLATFORM") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "PLATFORM vendors are exempt from membership billing",
        statusCode: 400,
      });
    }

    const stripe = getStripeServerClient();
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== "succeeded") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Card setup is not completed yet",
        statusCode: 400,
      });
    }

    const customerId =
      typeof setupIntent.customer === "string" ? setupIntent.customer : null;
    const paymentMethodId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? null;

    if (!customerId || !paymentMethodId) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Setup intent does not include a saved payment method",
        statusCode: 400,
      });
    }

    const customer = await this.ensureStripeCustomer(vendor);
    if (customer.id !== customerId) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Setup intent does not belong to this vendor",
        statusCode: 403,
      });
    }

    const subscription = await this.ensureSubscriptionForVendor(vendor.id);
    if (!subscription) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "PLATFORM vendors are exempt from membership billing",
        statusCode: 400,
      });
    }
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      default_payment_method: paymentMethodId,
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
    });

    await this.syncVendorFromStripeSubscription(vendor.id, updatedSubscription);

    return {
      setupIntentId: setupIntent.id,
      paymentMethodId,
      customerId: customer.id,
      subscriptionId: updatedSubscription.id,
    };
  }

  async getStatusForVendorUser(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    return {
      status: vendor.subscriptionStatus,
      membershipExempt: vendor.sellerType === "PLATFORM",
      monthlyAmount: env.MEMBERSHIP_FEE_AMOUNT,
      currency: env.MEMBERSHIP_INVOICE_CURRENCY,
      trialEndsAt: vendor.subscriptionTrialEndsAt?.toISOString() ?? null,
      isInTrial: vendor.subscriptionStatus === "TRIAL",
      overdueMonths: vendor.subscriptionStatus === "FAILED" ? 1 : 0,
      overdueDays:
        vendor.subscriptionGracePeriodEndsAt != null
          ? Math.max(
              0,
              Math.ceil(
                (Date.now() - vendor.subscriptionGracePeriodEndsAt.getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            )
          : 0,
      alertLevel:
        vendor.subscriptionStatus === "FAILED"
          ? "critical"
          : vendor.subscriptionStatus === "SUSPENDED"
            ? "suspended"
            : "none",
      shopSuspendedForBilling: vendor.subscriptionStatus === "SUSPENDED",
      gracePeriodEndsAt: vendor.subscriptionGracePeriodEndsAt?.toISOString() ?? null,
      failedPaymentCount: vendor.subscriptionFailedPaymentCount,
      stripeCustomerId: vendor.stripeCustomerId ?? null,
      stripeSubscriptionId: vendor.stripeSubscriptionId ?? null,
      defaultPaymentMethodAttached: Boolean(vendor.stripeDefaultPaymentMethodId),
      nextBillingAt: vendor.subscriptionNextBillingAt?.toISOString() ?? null,
      lastPaymentAt: vendor.subscriptionLastPaymentAt?.toISOString() ?? null,
    };
  }

  async createBillingPortalSessionForVendorUser(userId: string, returnUrl: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    if (vendor.sellerType === "PLATFORM") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "PLATFORM vendors are exempt from membership billing",
        statusCode: 400,
      });
    }

    const customer = await this.ensureStripeCustomer(vendor);
    await this.ensureSubscriptionForVendor(vendor.id);

    const stripe = getStripeServerClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return {
      url: portalSession.url,
    };
  }

  async ensureSubscriptionForVendor(vendorProfileId: string) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    if (vendor.sellerType === "PLATFORM") {
      await this.disableMembershipBillingForPlatformVendor(vendor);
      return null;
    }

    const customer = await this.ensureStripeCustomer(vendor);
    const stripe = getStripeServerClient();

    if (vendor.stripeSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(vendor.stripeSubscriptionId);
      await this.syncVendorFromStripeSubscription(vendor.id, existing);
      return existing;
    }

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const reusableSubscription =
      existingSubscriptions.data.find(
        (subscription) =>
          subscription.status !== "canceled" &&
          subscription.metadata.vendorProfileId === vendor.id
      ) ??
      existingSubscriptions.data.find((subscription) => subscription.status !== "canceled");

    if (reusableSubscription) {
      await this.syncVendorFromStripeSubscription(vendor.id, reusableSubscription);
      return reusableSubscription;
    }

    const trialEnd = this.resolveTrialEnd(vendor);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      collection_method: "charge_automatically",
      ...(trialEnd != null ? { trial_end: trialEnd } : {}),
      items: [await this.resolveSubscriptionItem()],
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        vendorProfileId: vendor.id,
      },
      expand: ["default_payment_method"],
    });

    await this.syncVendorFromStripeSubscription(vendor.id, subscription);
    return subscription;
  }

  async syncVendorFromStripeSubscription(vendorProfileId: string, subscription: Stripe.Subscription) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    const mapped = this.mapSubscriptionStatus(subscription.status);
    const period = stripeSubscriptionPeriod(subscription);
    await this.vendorProfileRepository.updateStep({
      vendorProfileId,
      onboardingStep: vendor.onboardingStep,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
      stripeSubscriptionId: subscription.id,
      stripeDefaultPaymentMethodId:
        typeof subscription.default_payment_method === "string"
          ? subscription.default_payment_method
          : subscription.default_payment_method?.id ?? null,
      subscriptionStatus: mapped,
      subscriptionTrialEndsAt: this.toDate(subscription.trial_end),
      subscriptionCurrentPeriodStart: this.toDate(period.start),
      subscriptionCurrentPeriodEnd: this.toDate(period.end),
      subscriptionNextBillingAt: this.toDate(period.end),
      ...(mapped === "ACTIVE" || mapped === "TRIAL"
        ? {
            subscriptionGracePeriodEndsAt: null,
            subscriptionFailedAt: null,
            ...(mapped === "ACTIVE" ? { subscriptionFailedPaymentCount: 0 } : {}),
          }
        : {}),
    });

    await syncVendorBillingAccess(vendorProfileId);
  }

  private async ensureStripeCustomer(vendor: NonNullable<VendorProfileWithUser>) {
    const stripe = getStripeServerClient();

    if (vendor.stripeCustomerId) {
      const existing = await stripe.customers.retrieve(vendor.stripeCustomerId);
      if (!("deleted" in existing) || existing.deleted !== true) {
        return existing as Stripe.Customer;
      }
    }

    const created = await stripe.customers.create({
      email: vendor.user.email,
      name: vendor.storeName ?? vendor.user.fullName,
      metadata: {
        vendorProfileId: vendor.id,
        userId: vendor.userId,
      },
    });

    await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendor.id,
      onboardingStep: vendor.onboardingStep,
      stripeCustomerId: created.id,
    });

    return created;
  }

  private async resolveSubscriptionItem(): Promise<Stripe.SubscriptionCreateParams.Item> {
    if (env.STRIPE_MEMBERSHIP_PRICE_ID) {
      return { price: env.STRIPE_MEMBERSHIP_PRICE_ID };
    }

    const stripe = getStripeServerClient();
    const product = await stripe.products.create({
      name: "Vendor Membership",
      metadata: { purpose: "membership_subscription" },
    });

    return {
      price_data: {
        currency: env.MEMBERSHIP_INVOICE_CURRENCY.toLowerCase(),
        product: product.id,
        unit_amount: env.MEMBERSHIP_FEE_AMOUNT,
        recurring: {
          interval: "month",
        },
      },
    };
  }

  private resolveTrialEnd(vendor: NonNullable<VendorProfileWithUser>) {
    const anchor = vendor.approvedAt ?? vendor.createdAt;
    const trialEndsAt = new Date(anchor);
    trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + env.MEMBERSHIP_TRIAL_DAYS);
    const unix = Math.floor(trialEndsAt.getTime() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    return unix > nowUnix ? unix : null;
  }

  private mapSubscriptionStatus(
    status: Stripe.Subscription.Status
  ): "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED" {
    if (status === "trialing") {
      return "TRIAL";
    }
    if (status === "active") {
      return "ACTIVE";
    }
    if (status === "canceled" || status === "unpaid" || status === "paused") {
      return "SUSPENDED";
    }
    return "FAILED";
  }

  private toDate(value?: number | null) {
    if (!value) return null;
    return new Date(value * 1000);
  }

  private async disableMembershipBillingForPlatformVendor(
    vendor: NonNullable<VendorProfileWithUser>
  ) {
    const stripe = getStripeServerClient();
    if (vendor.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(vendor.stripeSubscriptionId);
        if (existing.status !== "canceled") {
          await stripe.subscriptions.cancel(existing.id);
        }
      } catch {
        // Best effort: local exemption still applies even if Stripe cancellation fails.
      }
    }

    await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendor.id,
      onboardingStep: vendor.onboardingStep,
      subscriptionStatus: "ACTIVE",
      stripeSubscriptionId: null,
      stripeDefaultPaymentMethodId: null,
      subscriptionGracePeriodEndsAt: null,
      subscriptionFailedAt: null,
      subscriptionFailedPaymentCount: 0,
      subscriptionNextBillingAt: null,
    });
    await syncVendorBillingAccess(vendor.id);
  }
}
