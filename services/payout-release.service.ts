import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import {
  computeExpressPayoutHoldUntilAfterDelivery,
  isExpressPendingDeliveryHold,
  isPayoutEligibleForRelease,
} from "@/lib/payout/payout-hold";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";

export class PayoutReleaseService {
  constructor(
    private readonly payoutRepository = new PayoutRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  /**
   * Moves held earnings to available balance (READY). Used for manual admin release.
   */
  async releaseToAvailable(
    payoutId: string,
    actor?: Pick<AuthenticatedUser, "id" | "role">
  ) {
    const now = new Date();
    const existing = await this.payoutRepository.findById(payoutId);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found",
        statusCode: 404,
      });
    }

    if (existing.status === "READY" || existing.status === "SENT") {
      return existing;
    }

    await this.requireReleasablePayout(payoutId);
    await this.moveHoldToAvailableAndMarkReleased(existing, now);

    const updated = await this.payoutRepository.findById(payoutId);
    if (!updated) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found after release",
        statusCode: 404,
      });
    }

    if (actor) {
      await this.auditLogRepository.create({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: "admin.payout_released",
        entityType: "Payout",
        entityId: updated.id,
      });
    }

    return updated;
  }

  /**
   * Auto-payout path: release hold and mark sent (bank / PayPal transfer queued).
   */
  async autoTransfer(payoutId: string) {
    const payout = await this.payoutRepository.findById(payoutId);

    if (!payout || payout.status !== "ON_HOLD") {
      return { transferred: false, reason: "not_on_hold" as const };
    }

    const vendorOrder = await this.orderRepository.findVendorOrderById(
      payout.orderVendorId
    );

    if (
      !vendorOrder ||
      !isPayoutEligibleForRelease({
        deliveryMethod: vendorOrder.deliveryMethod,
        vendorOrderStatus: vendorOrder.status,
        deliveredAt: vendorOrder.deliveredAt,
        holdUntil: payout.holdUntil,
      })
    ) {
      return { transferred: false, reason: "hold_not_elapsed" as const };
    }

    const now = new Date();
    await this.moveHoldToAvailableAndMarkReleased(payout, now);
    const updated = await this.markSent(payout.id);

    await this.auditLogRepository.create({
      actorRole: "ADMIN",
      action: "system.payout_auto_transferred",
      entityType: "Payout",
      entityId: updated.id,
    });

    return { transferred: true, payout: updated };
  }

  async markSent(
    payoutId: string,
    actor?: Pick<AuthenticatedUser, "id" | "role">,
    options?: { sentVia?: "BANK" }
  ) {
    const payout = await this.payoutRepository.findById(payoutId);
    if (!payout) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found",
        statusCode: 404,
      });
    }

    if (payout.status === "SENT") {
      return payout;
    }

    if (payout.status !== "READY") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only released payouts can be marked as sent",
        statusCode: 400,
      });
    }

    const now = new Date();
    const transition = await prisma.payout.updateMany({
      where: {
        id: payoutId,
        status: "READY",
      },
      data: {
        status: "SENT",
        sentAt: now,
      },
    });

    if (transition.count === 0) {
      const latest = await this.payoutRepository.findById(payoutId);
      if (!latest) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Payout not found",
          statusCode: 404,
        });
      }
      if (latest.status === "SENT") {
        return latest;
      }
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payout could not be marked as sent",
        statusCode: 400,
      });
    }

    const updated = await this.payoutRepository.findById(payoutId);
    if (!updated) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found after sent update",
        statusCode: 404,
      });
    }

    if (actor) {
      await this.auditLogRepository.create({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: "admin.payout_marked_sent",
        entityType: "Payout",
        entityId: updated.id,
        metadata: {
          sentVia: options?.sentVia ?? "BANK",
        },
      });
    }

    return updated;
  }

  async assertAdminCanRelease(payoutId: string) {
    await this.requireReleasablePayout(payoutId);
  }

  /** Express payouts stay on hold until the vendor marks the order delivered. */
  async syncExpressHoldOnDelivery(input: {
    orderVendorId: string;
    deliveredAt: Date;
  }) {
    const [payout, vendorOrder] = await Promise.all([
      this.payoutRepository.findByOrderVendorId(input.orderVendorId),
      this.orderRepository.findVendorOrderById(input.orderVendorId),
    ]);

    if (
      !payout ||
      payout.status !== "ON_HOLD" ||
      !vendorOrder ||
      vendorOrder.deliveryMethod !== "EXPRESS"
    ) {
      return { updated: false as const };
    }

    const holdUntil = computeExpressPayoutHoldUntilAfterDelivery(input.deliveredAt);
    await this.payoutRepository.updateHoldUntil(payout.id, holdUntil);

    return { updated: true as const, holdUntil };
  }

  private async requireReleasablePayout(payoutId: string) {
    const payout = await this.payoutRepository.findById(payoutId);

    if (!payout) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found",
        statusCode: 404,
      });
    }

    const now = new Date();
    const vendorOrder = await this.orderRepository.findVendorOrderById(
      payout.orderVendorId
    );

    if (!vendorOrder) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found for payout",
        statusCode: 404,
      });
    }

    let effectiveHoldUntil = payout.holdUntil;
    if (
      vendorOrder.deliveryMethod === "EXPRESS" &&
      vendorOrder.status === "DELIVERED" &&
      vendorOrder.deliveredAt &&
      isExpressPendingDeliveryHold(payout.holdUntil)
    ) {
      effectiveHoldUntil = computeExpressPayoutHoldUntilAfterDelivery(
        vendorOrder.deliveredAt
      );
      await this.payoutRepository.updateHoldUntil(payout.id, effectiveHoldUntil);
    }

    if (payout.status !== "ON_HOLD") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payout is not ready for release",
        statusCode: 400,
      });
    }

    if (
      !isPayoutEligibleForRelease({
        deliveryMethod: vendorOrder.deliveryMethod,
        vendorOrderStatus: vendorOrder.status,
        deliveredAt: vendorOrder.deliveredAt,
        holdUntil: effectiveHoldUntil,
        now,
      })
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message:
          vendorOrder.deliveryMethod === "EXPRESS"
            ? "Express payout cannot be released until the order is delivered"
            : "Payout is not ready for release",
        statusCode: 400,
      });
    }

    return payout;
  }

  private async moveHoldToAvailableAndMarkReleased(
    payout: {
      id: string;
      vendorProfileId: string;
      orderVendorId: string;
      amount: number;
      currency: string;
      holdUntil: Date;
    },
    releasedAt: Date
  ) {
    await prisma.$transaction(async (tx) => {
      const transition = await tx.payout.updateMany({
        where: {
          id: payout.id,
          status: "ON_HOLD",
          holdUntil: {
            lte: releasedAt,
          },
        },
        data: {
          status: "READY",
          releasedAt,
        },
      });

      if (transition.count === 0) {
        return;
      }

      await tx.vendorLedgerEntry.create({
        data: {
          vendorProfileId: payout.vendorProfileId,
          orderVendorId: payout.orderVendorId,
          payoutId: payout.id,
          bucket: "HOLD",
          entryType: "HOLD_RELEASE_DEBIT",
          amount: -payout.amount,
          currency: payout.currency,
          description: `Release hold for payout ${payout.id}`,
        },
      });

      await tx.vendorLedgerEntry.create({
        data: {
          vendorProfileId: payout.vendorProfileId,
          orderVendorId: payout.orderVendorId,
          payoutId: payout.id,
          bucket: "AVAILABLE",
          entryType: "HOLD_RELEASE_CREDIT",
          amount: payout.amount,
          currency: payout.currency,
          description: `Available balance for payout ${payout.id}`,
        },
      });
    });
  }

}
