export const roles = ["CUSTOMER", "VENDOR", "ADMIN"] as const;

export type Role = (typeof roles)[number];
