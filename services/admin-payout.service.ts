import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { isPayoutEligibleForRelease, payoutHoldLabel } from "@/lib/payout/payout-hold";
import { sendVendorPayoutNotification } from "@/lib/mail/send-vendor-payout-notifications";
import { PayoutRepository } from "@/repositories/payout.repository";
import { PayoutReleaseService } from "@/services/payout-release.service";

export class AdminPayoutService {
  constructor(
    private readonly payoutRepository = new PayoutRepository(),
    private readonly payoutReleaseService = new PayoutReleaseService()
  ) {}

  async release(
    input: {
      payoutId?: string;
      vendorProfileId?: string;
    },
    admin: AuthenticatedUser
  ) {
    if ((!input.payoutId && !input.vendorProfileId) || (input.payoutId && input.vendorProfileId)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Provide exactly one of payoutId or vendorProfileId",
        statusCode: 400,
      });
    }

    const now = new Date();
    let payouts: Awaited<ReturnType<PayoutRepository["listReleasable"]>>;

    if (input.payoutId) {
      const payout = await this.payoutRepository.findById(input.payoutId);
      if (!payout) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Payout not found",
          statusCode: 404,
        });
      }
      payouts = [payout];
    } else {
      const candidates = await this.payoutRepository.listReleasable({
        vendorProfileId: input.vendorProfileId,
        now,
      });
      payouts = [];
      for (const payout of candidates) {
        try {
          await this.payoutReleaseService.assertAdminCanRelease(payout.id);
          payouts.push(payout);
        } catch {
          // Not yet releasable (typically hold window not reached)
        }
      }
    }

    if (payouts.length === 0) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "No releasable payouts found",
        statusCode: 404,
      });
    }

    const released = [];

    for (const payout of payouts) {
      const updated = await this.payoutReleaseService.releaseToAvailable(payout.id, admin);
      released.push(updated);
      if (updated.status === "READY") {
        await sendVendorPayoutNotification({ payoutId: updated.id, type: "RELEASED" });
      }
    }

    return {
      count: released.length,
      payouts: released,
    };
  }

  async markSent(
    input: { payoutId: string; sentVia?: "BANK" },
    admin: AuthenticatedUser
  ) {
    const payout = await this.payoutReleaseService.markSent(input.payoutId, admin, {
      sentVia: input.sentVia ?? "BANK",
    });
    if (payout.status === "SENT") {
      await sendVendorPayoutNotification({
        payoutId: payout.id,
        type: "SENT",
        sentVia: input.sentVia ?? "BANK",
      });
    }
    return { payout, sentVia: input.sentVia ?? "BANK" };
  }

  async getDetail(payoutId: string) {
    const payout = await this.payoutRepository.findByIdForAdmin(payoutId);

    if (!payout) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found",
        statusCode: 404,
      });
    }

    const now = new Date();
    const orderVendor = payout.orderVendor;

    return {
      ...this.serializePayout(
        {
          ...payout,
          orderVendor,
          vendorProfile: payout.vendorProfile,
        },
        now
      ),
      vendorOrder: {
        status: orderVendor.status,
        deliveryMethod: orderVendor.deliveryMethod,
        deliveredAt: orderVendor.deliveredAt?.toISOString() ?? null,
        subtotalAmount: orderVendor.subtotalAmount,
        deliveryAmount: orderVendor.deliveryAmount,
        discountAmount: orderVendor.discountAmount ?? 0,
        grandTotalAmount: orderVendor.grandTotalAmount,
        currency: orderVendor.currency,
      },
      lineItems: orderVendor.items.map((item) => ({
        productName: item.productName,
        productSku: item.productSku,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        lineTotalAmount: item.lineTotalAmount,
        currency: item.currency,
      })),
      commission: payout.commission
        ? {
            rateBps: payout.commission.rateBps,
            baseAmount: payout.commission.baseAmount,
            commissionAmount: payout.commission.commissionAmount,
            currency: payout.commission.currency,
          }
        : null,
      sendMethod: "BANK" as const,
      bankDetails: payout.payoutMethod
        ? {
            method: payout.payoutMethod.method,
            accountName: payout.payoutMethod.accountName,
            accountNumberOrIban: payout.payoutMethod.accountNumberOrIban,
            bankName: payout.payoutMethod.bankName,
            stripeEmail: payout.payoutMethod.stripeEmail,
          }
        : null,
    };
  }

  async queues() {
    const now = new Date();
    const [allOnHold, released] = await Promise.all([
      this.payoutRepository.listForAdmin({
        statuses: ["ON_HOLD"],
      }),
      this.payoutRepository.listForAdmin({
        statuses: ["READY", "SENT"],
      }),
    ]);

    const serializedOnHold = allOnHold.map((payout) => this.serializePayout(payout, now));
    const hold = serializedOnHold.filter((payout) => !payout.eligibleForRelease);
    const ready = serializedOnHold.filter((payout) => payout.eligibleForRelease);

    return {
      now: now.toISOString(),
      hold,
      ready,
      released: released.map((payout) => this.serializePayout(payout, now)),
    };
  }

  private serializePayout(
    payout: Awaited<ReturnType<PayoutRepository["listForAdmin"]>>[number],
    now: Date
  ) {
    const vendorLabel = payout.vendorProfile.storeName ?? payout.vendorProfile.storeSlug ?? "Vendor";
    const orderVendor = payout.orderVendor;
    return {
      id: payout.id,
      status: payout.status,
      amount: payout.amount,
      currency: payout.currency,
      holdUntil: payout.holdUntil.toISOString(),
      holdLabel: payoutHoldLabel({
        deliveryMethod: orderVendor.deliveryMethod,
        vendorOrderStatus: orderVendor.status,
        deliveredAt: orderVendor.deliveredAt,
        holdUntil: payout.holdUntil,
        status: payout.status,
      }),
      releasedAt: payout.releasedAt?.toISOString() ?? null,
      sentAt: payout.sentAt?.toISOString() ?? null,
      createdAt: payout.createdAt.toISOString(),
      vendor: {
        id: payout.vendorProfile.id,
        storeName: payout.vendorProfile.storeName,
        storeSlug: payout.vendorProfile.storeSlug,
        label: vendorLabel,
      },
      order: {
        orderVendorId: orderVendor.id,
        orderId: orderVendor.orderId,
        orderNumber: orderVendor.order.orderNumber,
      },
      eligibleForRelease:
        payout.status === "ON_HOLD" &&
        isPayoutEligibleForRelease({
          deliveryMethod: orderVendor.deliveryMethod,
          vendorOrderStatus: orderVendor.status,
          deliveredAt: orderVendor.deliveredAt,
          holdUntil: payout.holdUntil,
          now,
        }),
    };
  }
}
