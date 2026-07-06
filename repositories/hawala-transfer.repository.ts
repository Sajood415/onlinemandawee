import type { HawalaTransferStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";

const hawalaTransferSelect = {
  id: true,
  transferNumber: true,
  userId: true,
  senderName: true,
  senderPhone: true,
  senderEmail: true,
  senderCountry: true,
  senderAddress: true,
  senderBankName: true,
  senderAccountNumber: true,
  receiverName: true,
  receiverPhone: true,
  receiverCountry: true,
  receiverAddress: true,
  receiverBankName: true,
  receiverAccountNumber: true,
  sendAmountMinor: true,
  sendCurrency: true,
  receiveAmountMinor: true,
  receiveCurrency: true,
  exchangeRate: true,
  note: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class HawalaTransferRepository {
  findByTransferNumber(transferNumber: string) {
    return prisma.hawalaTransfer.findUnique({
      where: { transferNumber },
    });
  }

  findById(id: string) {
    return prisma.hawalaTransfer.findUnique({
      where: { id },
      select: hawalaTransferSelect,
    });
  }

  list(filters?: { status?: HawalaTransferStatus; search?: string }) {
    const search = filters?.search?.trim();

    return prisma.hawalaTransfer.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { transferNumber: { contains: search, mode: "insensitive" } },
                { senderName: { contains: search, mode: "insensitive" } },
                { senderPhone: { contains: search, mode: "insensitive" } },
                { receiverName: { contains: search, mode: "insensitive" } },
                { receiverPhone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: hawalaTransferSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  listForCustomer(userId: string) {
    return prisma.hawalaTransfer.findMany({
      where: { userId },
      select: hawalaTransferSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForCustomer(id: string, userId: string) {
    return prisma.hawalaTransfer.findFirst({
      where: { id, userId },
      select: hawalaTransferSelect,
    });
  }

  create(input: {
    transferNumber: string;
    userId?: string | null;
    senderName: string;
    senderPhone: string;
    senderEmail?: string | null;
    senderCountry: string;
    senderAddress: string;
    senderBankName: string;
    senderAccountNumber: string;
    receiverName: string;
    receiverPhone: string;
    receiverCountry: string;
    receiverAddress: string;
    receiverBankName: string;
    receiverAccountNumber: string;
    sendAmountMinor: number;
    sendCurrency: string;
    receiveAmountMinor: number;
    receiveCurrency: string;
    exchangeRate: number;
    note?: string | null;
  }) {
    return prisma.hawalaTransfer.create({
      data: {
        transferNumber: input.transferNumber,
        userId: input.userId ?? null,
        senderName: input.senderName,
        senderPhone: input.senderPhone,
        senderEmail: input.senderEmail ?? null,
        senderCountry: input.senderCountry,
        senderAddress: input.senderAddress,
        senderBankName: input.senderBankName,
        senderAccountNumber: input.senderAccountNumber,
        receiverName: input.receiverName,
        receiverPhone: input.receiverPhone,
        receiverCountry: input.receiverCountry,
        receiverAddress: input.receiverAddress,
        receiverBankName: input.receiverBankName,
        receiverAccountNumber: input.receiverAccountNumber,
        sendAmountMinor: input.sendAmountMinor,
        sendCurrency: input.sendCurrency,
        receiveAmountMinor: input.receiveAmountMinor,
        receiveCurrency: input.receiveCurrency,
        exchangeRate: input.exchangeRate,
        note: input.note ?? null,
        status: "PENDING",
      },
      select: hawalaTransferSelect,
    });
  }

  updateStatus(
    id: string,
    input: { status: HawalaTransferStatus; adminNote?: string | null }
  ) {
    return prisma.hawalaTransfer.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
      },
      select: hawalaTransferSelect,
    });
  }

  /**
   * Attach previously-submitted guest transfers (userId: null) to a newly
   * signed-in / registered account, matched by sender email or sender phone.
   *
   * MongoDB + Prisma quirk: `userId: null` in a `where` clause does not
   * reliably match unset/null fields, so we load candidates by contact info
   * and filter unclaimed rows in application code (mirrors
   * OrderRepository.claimGuestOrdersForUser).
   */
  async claimGuestTransfersForUser(
    userId: string,
    input: { email?: string | null; phone?: string | null }
  ) {
    const normalizedEmail = input.email ? normalizeEmailForAuth(input.email) : null;
    const phone = input.phone?.trim() || null;

    if (!normalizedEmail && !phone) return 0;

    const orConditions: Prisma.HawalaTransferWhereInput[] = [];
    if (normalizedEmail) orConditions.push({ senderEmail: { not: null } });
    if (phone) orConditions.push({ senderPhone: phone });

    const candidates = await prisma.hawalaTransfer.findMany({
      where: { OR: orConditions },
      select: { id: true, userId: true, senderEmail: true, senderPhone: true },
    });

    const ids = candidates
      .filter((transfer) => {
        if (transfer.userId != null) return false;
        const emailMatches =
          Boolean(normalizedEmail) &&
          Boolean(transfer.senderEmail) &&
          normalizeEmailForAuth(transfer.senderEmail as string) === normalizedEmail;
        const phoneMatches = Boolean(phone) && transfer.senderPhone === phone;
        return emailMatches || phoneMatches;
      })
      .map((transfer) => transfer.id);

    if (ids.length === 0) return 0;

    await prisma.hawalaTransfer.updateMany({
      where: { id: { in: ids } },
      data: { userId },
    });

    return ids.length;
  }
}

export type HawalaTransferRecord = NonNullable<
  Awaited<ReturnType<HawalaTransferRepository["findById"]>>
>;
