export type RefundCaseStatus =
  | "REQUESTED"
  | "WAITING_VENDOR"
  | "ESCALATED_ADMIN"
  | "RESOLVED";

export type RefundDecisionType = "APPROVE" | "REJECT" | "PARTIAL";

export type RefundCaseListItem = {
  id: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  requestedAmount: number;
  status: RefundCaseStatus;
  vendorResponseDueAt: string | null;
  escalatedAt: string | null;
  finalDecisionAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    paymentStatus: string;
    currency: string;
  };
  orderItem: {
    id: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    lineTotalAmount: number;
  };
  customer: {
    id: string;
    fullName: string;
    email: string;
  };
  vendor: {
    vendorProfileId: string;
    storeName: string | null;
    storeSlug: string | null;
    sellerType: "PLATFORM" | "THIRD_PARTY";
  };
  decision: {
    decisionType: RefundDecisionType;
    approvedAmount: number;
    createdAt: string;
  } | null;
};

export type RefundCaseDetail = RefundCaseListItem & {
  customerUserId: string;
  vendorProfileId: string;
  description: string | null;
  vendorExplanation: string | null;
  customer: RefundCaseListItem["customer"] & { phone: string | null };
  vendor: RefundCaseListItem["vendor"] & {
    user: {
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
    };
  };
  decision: {
    decisionType: RefundDecisionType;
    approvedAmount: number;
    reason: string | null;
    createdAt: string;
  } | null;
  evidences: Array<{
    id: string;
    actorRole: string;
    fileUrl: string | null;
    note: string | null;
    createdAt: string;
  }>;
};

export type DisputeMessage = {
  id: string;
  senderRole: "CUSTOMER" | "VENDOR" | "ADMIN";
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
  senderUser: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type RefundListResponse = {
  items: RefundCaseListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/** Message keys under Disputes.statuses.* */
export const REFUND_STATUS_LABELS: Record<RefundCaseStatus, `statuses.${RefundCaseStatus}`> = {
  REQUESTED: "statuses.REQUESTED",
  WAITING_VENDOR: "statuses.WAITING_VENDOR",
  ESCALATED_ADMIN: "statuses.ESCALATED_ADMIN",
  RESOLVED: "statuses.RESOLVED",
};

export const REFUND_STATUS_BADGE: Record<RefundCaseStatus, string> = {
  REQUESTED: "bg-neutral-100 text-neutral-700",
  WAITING_VENDOR: "bg-amber-50 text-amber-700",
  ESCALATED_ADMIN: "bg-orange-50 text-orange-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
};

/** Message keys under Disputes.decisions.* */
export const REFUND_DECISION_LABELS: Record<
  RefundDecisionType,
  `decisions.${RefundDecisionType}`
> = {
  APPROVE: "decisions.APPROVE",
  PARTIAL: "decisions.PARTIAL",
  REJECT: "decisions.REJECT",
};

export const REFUND_DECISION_BADGE: Record<RefundDecisionType, string> = {
  APPROVE: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-800",
  REJECT: "bg-red-50 text-red-700",
};

export function getRefundOutcomeDisplay(input: {
  status: RefundCaseStatus;
  decision: { decisionType: RefundDecisionType } | null;
}) {
  if (input.decision) {
    return {
      labelKey: REFUND_DECISION_LABELS[input.decision.decisionType],
      badgeClass: REFUND_DECISION_BADGE[input.decision.decisionType],
    };
  }

  return {
    labelKey: REFUND_STATUS_LABELS[input.status],
    badgeClass: REFUND_STATUS_BADGE[input.status],
  };
}

/** Stable reason codes; translate via Disputes.request.reasons.* at render. */
export const REFUND_REASON_CODES = [
  "itemNotAsDescribed",
  "damagedOrDefective",
  "wrongItemReceived",
  "notDelivered",
  "other",
] as const;

export type RefundReasonCode = (typeof REFUND_REASON_CODES)[number];

/** English text stored for non-custom reasons (API / history). */
export const REFUND_REASON_SUBMIT_EN: Record<
  Exclude<RefundReasonCode, "other">,
  string
> = {
  itemNotAsDescribed: "Item not as described",
  damagedOrDefective: "Damaged or defective",
  wrongItemReceived: "Wrong item received",
  notDelivered: "Not delivered",
};
