import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { generateUniqueGuestTrackingToken } from "@/lib/orders/generate-guest-tracking-token";
import {
  serializeGuestPublicOrder,
  type GuestTrackingOrderRecord,
} from "@/lib/orders/serialize-guest-public-order";
import type { GuestOrderLookupResponse } from "@/lib/orders/guest-public-order-types";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { OrderRepository } from "@/repositories/order.repository";

export class GuestOrderTrackingService {
  constructor(private readonly orderRepository = new OrderRepository()) {}

  async getOrderByTrackingToken(token: string) {
    const order = await this.orderRepository.findByGuestTrackingToken(token);
    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    return serializeGuestPublicOrder(order);
  }

  async lookupOrderByNumberAndEmail(input: {
    orderNumber: string;
    guestEmail: string;
  }): Promise<GuestOrderLookupResponse> {
    const order = await this.orderRepository.findByOrderNumberForGuestTracking(input.orderNumber);

    if (
      !order ||
      !order.guestEmail ||
      normalizeEmailForAuth(order.guestEmail) !== normalizeEmailForAuth(input.guestEmail)
    ) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "No order found with that order number and email.",
        statusCode: 404,
      });
    }

    const resolved = await this.ensureGuestTrackingToken(order);
    return {
      order: serializeGuestPublicOrder(resolved),
      trackingToken: resolved.guestTrackingToken,
    };
  }

  private async ensureGuestTrackingToken(order: GuestTrackingOrderRecord) {
    if (order.guestTrackingToken) {
      return order;
    }

    const guestTrackingToken = await generateUniqueGuestTrackingToken();
    return this.orderRepository.setGuestTrackingToken(order.id, guestTrackingToken);
  }
}
