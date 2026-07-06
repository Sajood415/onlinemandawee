import type { HawalaTransferStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { convertHawalaAmountMinor, getHawalaExchangeRate } from "@/lib/hawala/convert";
import { buildHawalaStatusEmailHtml } from "@/lib/mail/hawala-status-email-html";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import {
  HawalaTransferRepository,
  type HawalaTransferRecord,
} from "@/repositories/hawala-transfer.repository";
import { HawalaExchangeRateService } from "@/services/hawala-exchange-rate.service";
import type { CreateHawalaTransferInput } from "@/validators/hawala.validator";

function serializeTransfer(transfer: HawalaTransferRecord) {
  return {
    ...transfer,
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

async function generateUniqueTransferNumber(repository: HawalaTransferRepository) {
  for (let i = 0; i < 20; i++) {
    const candidate = `HW-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await repository.findByTransferNumber(candidate);
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique transfer number");
}

const CLOSED_STATUSES: HawalaTransferStatus[] = ["COMPLETED", "FAILED", "CANCELLED", "REJECTED"];

function buildStatusEmailCopy(
  transfer: HawalaTransferRecord,
  status: HawalaTransferStatus,
  adminNote?: string | null
): { heading: string; message: string } {
  const sendAmount = (transfer.sendAmountMinor / 100).toFixed(2);
  const receiveAmount = (transfer.receiveAmountMinor / 100).toFixed(2);
  const note = adminNote?.trim();

  switch (status) {
    case "APPROVED":
      return {
        heading: "Your transfer has been approved",
        message: `Your Hawala transfer of ${sendAmount} ${transfer.sendCurrency} to ${transfer.receiverName} has been approved and is now being processed.`,
      };
    case "IN_PROGRESS":
      return {
        heading: "Your transfer is in progress",
        message: `Your Hawala transfer is now in progress. ${transfer.receiverName} will receive ${receiveAmount} ${transfer.receiveCurrency} shortly.`,
      };
    case "DELIVERED":
      return {
        heading: "Funds have been delivered",
        message: `The funds for your Hawala transfer have been delivered to ${transfer.receiverName}.`,
      };
    case "COMPLETED":
      return {
        heading: "Your transfer is complete",
        message: `Your Hawala transfer has been completed successfully. Thank you for using our service.`,
      };
    case "REJECTED":
      return {
        heading: "Your transfer was not approved",
        message: note
          ? `Unfortunately your Hawala transfer could not be approved. Reason: ${note}`
          : "Unfortunately your Hawala transfer could not be approved. Please contact support for more information.",
      };
    case "FAILED":
      return {
        heading: "Your transfer has failed",
        message: note
          ? `Unfortunately your Hawala transfer could not be completed. Reason: ${note}`
          : "Unfortunately your Hawala transfer could not be completed. Please contact support for assistance.",
      };
    case "CANCELLED":
      return {
        heading: "Your transfer was cancelled",
        message: note
          ? `Your Hawala transfer has been cancelled. Note: ${note}`
          : "Your Hawala transfer has been cancelled.",
      };
    case "PENDING":
    default:
      return {
        heading: "Your transfer is pending review",
        message: "Your Hawala transfer has been received and is pending review.",
      };
  }
}

export class HawalaTransferService {
  constructor(
    private readonly hawalaTransferRepository = new HawalaTransferRepository(),
    private readonly hawalaExchangeRateService = new HawalaExchangeRateService(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async create(input: CreateHawalaTransferInput, userId?: string | null) {
    const ratesToAfn = await this.hawalaExchangeRateService.getRatesToAfnMap();
    const sendAmountMinor = Math.round(input.sendAmount * 100);

    let receiveAmountMinor: number;
    let exchangeRate: number;
    try {
      receiveAmountMinor = convertHawalaAmountMinor(
        sendAmountMinor,
        input.sendCurrency,
        input.receiveCurrency,
        ratesToAfn
      );
      exchangeRate = getHawalaExchangeRate(
        input.sendCurrency,
        input.receiveCurrency,
        ratesToAfn
      );
    } catch {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Exchange rate is not available for the selected currencies",
        statusCode: 400,
      });
    }

    const transferNumber = await generateUniqueTransferNumber(this.hawalaTransferRepository);

    const transfer = await this.hawalaTransferRepository.create({
      transferNumber,
      userId: userId ?? null,
      senderName: input.senderName.trim(),
      senderPhone: input.senderPhone.trim(),
      senderEmail: input.senderEmail ? normalizeEmailForAuth(input.senderEmail) : null,
      senderCountry: input.senderCountry.trim(),
      senderAddress: input.senderAddress.trim(),
      senderBankName: input.senderBankName.trim(),
      senderAccountNumber: input.senderAccountNumber.trim(),
      receiverName: input.receiverName.trim(),
      receiverPhone: input.receiverPhone.trim(),
      receiverCountry: input.receiverCountry.trim(),
      receiverAddress: input.receiverAddress.trim(),
      receiverBankName: input.receiverBankName.trim(),
      receiverAccountNumber: input.receiverAccountNumber.trim(),
      sendAmountMinor,
      sendCurrency: input.sendCurrency,
      receiveAmountMinor,
      receiveCurrency: input.receiveCurrency,
      exchangeRate,
      note: input.note?.trim() || null,
    });

    await this.auditLogRepository.create({
      actorUserId: userId ?? undefined,
      actorRole: "CUSTOMER",
      action: "hawala.transfer_submitted",
      entityType: "HawalaTransfer",
      entityId: transfer.id,
      metadata: { transferNumber: transfer.transferNumber },
    });

    if (transfer.senderEmail) {
      const sendAmount = (transfer.sendAmountMinor / 100).toFixed(2);
      const receiveAmount = (transfer.receiveAmountMinor / 100).toFixed(2);
      const heading = "Transfer request received";
      const message = `We've received your Hawala transfer request to send ${sendAmount} ${transfer.sendCurrency} to ${transfer.receiverName} (${receiveAmount} ${transfer.receiveCurrency}). Our team will review it shortly, and we'll email you whenever the status changes.`;

      try {
        await sendTransactionalEmail({
          to: transfer.senderEmail,
          subject: `${env.APP_NAME} — transfer request received (${transfer.transferNumber})`,
          text: `Hi ${transfer.senderName},\n\n${message}\n\nTransfer #: ${transfer.transferNumber}\n\n${env.APP_NAME} Team`,
          html: buildHawalaStatusEmailHtml({
            appName: env.APP_NAME,
            transferNumber: transfer.transferNumber,
            heading,
            message,
          }),
        });
      } catch {
        // Transfer is saved; do not fail the request if the confirmation email fails.
      }
    }

    return serializeTransfer(transfer);
  }

  listForAdmin(filters?: { status?: HawalaTransferStatus; search?: string }) {
    return this.hawalaTransferRepository
      .list(filters)
      .then((rows) => rows.map(serializeTransfer));
  }

  async getForAdmin(id: string) {
    const transfer = await this.hawalaTransferRepository.findById(id);
    if (!transfer) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Hawala transfer not found",
        statusCode: 404,
      });
    }
    return serializeTransfer(transfer);
  }

  async updateStatusForAdmin(
    auth: AuthenticatedUser,
    id: string,
    input: { status: HawalaTransferStatus; adminNote?: string | null }
  ) {
    const existing = await this.getForAdmin(id);

    if (CLOSED_STATUSES.includes(existing.status) && existing.status !== input.status) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `Cannot change status of a ${existing.status.toLowerCase()} transfer`,
        statusCode: 400,
      });
    }

    const updated = await this.hawalaTransferRepository.updateStatus(id, {
      status: input.status,
      adminNote: input.adminNote !== undefined ? input.adminNote || null : undefined,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "hawala.admin_status_updated",
      entityType: "HawalaTransfer",
      entityId: id,
      metadata: { fromStatus: existing.status, toStatus: input.status },
    });

    if (updated.senderEmail && existing.status !== input.status) {
      const copy = buildStatusEmailCopy(updated, input.status, updated.adminNote);
      try {
        await sendTransactionalEmail({
          to: updated.senderEmail,
          subject: `${env.APP_NAME} — ${copy.heading}`,
          text: `Hi ${updated.senderName},\n\n${copy.message}\n\nTransfer #: ${updated.transferNumber}\n\n${env.APP_NAME} Team`,
          html: buildHawalaStatusEmailHtml({
            appName: env.APP_NAME,
            transferNumber: updated.transferNumber,
            heading: copy.heading,
            message: copy.message,
          }),
        });
      } catch {
        // Status is saved; do not fail the admin update if the notification email fails.
      }
    }

    return serializeTransfer(updated);
  }

  listForCustomer(auth: AuthenticatedUser) {
    return this.hawalaTransferRepository
      .listForCustomer(auth.id)
      .then((rows) => rows.map(serializeTransfer));
  }

  async getForCustomer(auth: AuthenticatedUser, id: string) {
    const transfer = await this.hawalaTransferRepository.findByIdForCustomer(id, auth.id);
    if (!transfer) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Hawala transfer not found",
        statusCode: 404,
      });
    }
    return serializeTransfer(transfer);
  }
}
