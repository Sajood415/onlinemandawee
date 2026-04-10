import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class VendorFinanceService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly payoutRepository = new PayoutRepository()
  ) {}

  async getWallet(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    const ledgerEntries = await this.vendorLedgerEntryRepository.listByVendorProfileId(
      vendor.id
    );
    const commissions = await this.commissionLedgerRepository.listByVendorProfileId(
      vendor.id
    );

    const holdBalance = ledgerEntries
      .filter((entry) => entry.bucket === "HOLD")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const availableBalance = ledgerEntries
      .filter((entry) => entry.bucket === "AVAILABLE")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalCommission = commissions.reduce(
      (sum, entry) => sum + entry.commissionAmount,
      0
    );

    return {
      vendorProfileId: vendor.id,
      currency: ledgerEntries[0]?.currency ?? "USD",
      holdBalance,
      availableBalance,
      totalCommission,
      recentEntries: ledgerEntries.slice(0, 20),
    };
  }

  async listPayouts(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    return this.payoutRepository.listByVendorProfileId(vendor.id);
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can access finance data",
        statusCode: 403,
      });
    }

    return vendor;
  }
}
