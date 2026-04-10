import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";

export class AdminPayoutService {
  constructor(
    private readonly payoutRepository = new PayoutRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async release(
    input: {
      payoutId?: string;
      vendorProfileId?: string;
    },
    admin: AuthenticatedUser
  ) {
    const now = new Date();
    const payouts = input.payoutId
      ? await this.resolveSinglePayout(input.payoutId, now)
      : await this.payoutRepository.listReleasable({
          vendorProfileId: input.vendorProfileId,
          now,
        });

    if (payouts.length === 0) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "No releasable payouts found",
        statusCode: 404,
      });
    }

    const released = [];

    for (const payout of payouts) {
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

      const updated = await this.payoutRepository.updateStatus(payout.id, "READY", {
        releasedAt: now,
      });

      await this.auditLogRepository.create({
        actorUserId: admin.id,
        actorRole: admin.role,
        action: "admin.payout_released",
        entityType: "Payout",
        entityId: updated.id,
      });

      released.push(updated);
    }

    return {
      count: released.length,
      payouts: released,
    };
  }

  private async resolveSinglePayout(payoutId: string, now: Date) {
    const payout = await this.payoutRepository.findById(payoutId);

    if (!payout) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Payout not found",
        statusCode: 404,
      });
    }

    if (payout.status !== "ON_HOLD" || payout.holdUntil > now) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payout is not ready for release",
        statusCode: 400,
      });
    }

    return [payout];
  }
}
