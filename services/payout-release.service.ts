import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { vendorHasExternalPayoutAccount } from "@/lib/vendor/external-payout-account";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class PayoutReleaseService {
  constructor(
    private readonly payoutRepository = new PayoutRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  /**
   * Moves held earnings to available balance (READY). Used for manual admin release.
   */
  async releaseToAvailable(
    payoutId: string,
    actor?: Pick<AuthenticatedUser, "id" | "role">
  ) {
    const payout = await this.requireReleasablePayout(payoutId);
    const now = new Date();

    await this.moveHoldToAvailable(payout);

    const updated = await this.payoutRepository.updateStatus(payout.id, "READY", {
      releasedAt: now,
    });

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

    const now = new Date();
    await this.moveHoldToAvailable(payout);

    const updated = await this.payoutRepository.updateStatus(payout.id, "SENT", {
      releasedAt: now,
      sentAt: now,
    });

    await this.auditLogRepository.create({
      actorRole: "ADMIN",
      action: "system.payout_auto_transferred",
      entityType: "Payout",
      entityId: updated.id,
    });

    return { transferred: true, payout: updated };
  }

  async assertAdminCanRelease(payoutId: string) {
    await this.requireReleasablePayout(payoutId);
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

    if (payout.status !== "ON_HOLD" || payout.holdUntil > now) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payout is not ready for release",
        statusCode: 400,
      });
    }

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

    const vendor = await this.vendorProfileRepository.findById(payout.vendorProfileId);
    const hasExternal = vendorHasExternalPayoutAccount(vendor?.payoutMethod ?? null);

    if (!hasExternal && vendorOrder.status !== "DELIVERED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message:
          "Payout can only be released manually after the order is marked delivered (vendor has no external payout account on file)",
        statusCode: 400,
      });
    }

    return payout;
  }

  private async moveHoldToAvailable(payout: {
    id: string;
    vendorProfileId: string;
    orderVendorId: string;
    amount: number;
    currency: string;
  }) {
    await this.vendorLedgerEntryRepository.create({
      vendorProfileId: payout.vendorProfileId,
      orderVendorId: payout.orderVendorId,
      payoutId: payout.id,
      bucket: "HOLD",
      entryType: "HOLD_RELEASE_DEBIT",
      amount: -payout.amount,
      currency: payout.currency,
      description: `Release hold for payout ${payout.id}`,
    });

    await this.vendorLedgerEntryRepository.create({
      vendorProfileId: payout.vendorProfileId,
      orderVendorId: payout.orderVendorId,
      payoutId: payout.id,
      bucket: "AVAILABLE",
      entryType: "HOLD_RELEASE_CREDIT",
      amount: payout.amount,
      currency: payout.currency,
      description: `Available balance for payout ${payout.id}`,
    });
  }
}
