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
      await this.payoutReleaseService.assertAdminCanRelease(input.payoutId);
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
          // Held until delivery when vendor has no external payout account
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
}
