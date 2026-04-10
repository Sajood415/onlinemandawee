export const productApprovalStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type ProductApprovalStatus =
  (typeof productApprovalStatuses)[number];
