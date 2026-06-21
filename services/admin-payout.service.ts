import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
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
    }

    return {
      count: released.length,
      payouts: released,
    };
  }

  async markSent(input: { payoutId: string }, admin: AuthenticatedUser) {
    const payout = await this.payoutReleaseService.markSent(input.payoutId, admin);
    return { payout };
  }

  async queues() {
    const now = new Date();
    const [hold, ready, released] = await Promise.all([
      this.payoutRepository.listForAdmin({
        statuses: ["ON_HOLD"],
        holdUntilGt: now,
      }),
      this.payoutRepository.listForAdmin({
        statuses: ["ON_HOLD"],
        holdUntilLte: now,
      }),
      this.payoutRepository.listForAdmin({
        statuses: ["READY", "SENT"],
      }),
    ]);

    return {
      now: now.toISOString(),
      hold: hold.map((payout) => this.serializePayout(payout, now)),
      ready: ready.map((payout) => this.serializePayout(payout, now)),
      released: released.map((payout) => this.serializePayout(payout, now)),
    };
  }

  private serializePayout(
    payout: Awaited<ReturnType<PayoutRepository["listForAdmin"]>>[number],
    now: Date
  ) {
    const vendorLabel = payout.vendorProfile.storeName ?? payout.vendorProfile.storeSlug ?? "Vendor";
    return {
      id: payout.id,
      status: payout.status,
      amount: payout.amount,
      currency: payout.currency,
      holdUntil: payout.holdUntil.toISOString(),
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
        orderVendorId: payout.orderVendor.id,
        orderId: payout.orderVendor.orderId,
        orderNumber: payout.orderVendor.order.orderNumber,
      },
      eligibleForRelease: payout.status === "ON_HOLD" && payout.holdUntil <= now,
    };
  }
}
