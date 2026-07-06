export const hawalaTransferStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type HawalaTransferStatus = (typeof hawalaTransferStatuses)[number];
