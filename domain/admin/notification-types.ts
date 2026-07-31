export const ADMIN_NOTIFICATION_TYPES = [
  "VENDOR_SUBMITTED",
  "PRODUCT_PENDING_APPROVAL",
  "GIFT_REQUEST_CREATED",
  "GIFT_REQUEST_PAID",
  "SUPPLY_REQUEST_CREATED",
  "SUPPLY_REQUEST_PAID",
  "SUPPLY_REQUEST_QUOTED",
  "SUPPLY_REQUEST_SHIPPED",
  "REFUND_ESCALATED",
  "REFUND_OVERDUE_ESCALATED",
  "HAWALA_SUBMITTED",
  "MEMBERSHIP_PAYMENT_FAILED",
  "VENDOR_BILLING_SUSPENDED",
  "WAREHOUSE_INBOUND_SHIPPED",
  "WAREHOUSE_BATCH_READY",
] as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const ADMIN_NOTIFICATIONS_ROOM = "admin:notifications";

export type AdminNotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  read: boolean;
};

export type AdminNotificationBroadcastBody = {
  room: typeof ADMIN_NOTIFICATIONS_ROOM;
  event: "admin.notification.created";
  payload: AdminNotificationPayload;
};
