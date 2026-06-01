export const MEMBERSHIP_UNPAID_SUSPENSION_REASON =
  "Shop suspended: unpaid marketplace subscription (4+ months overdue)";

export const MEMBERSHIP_SUSPEND_AFTER_OVERDUE_MONTHS = 4;
export const MEMBERSHIP_WARN_OVERDUE_MONTHS_MIN = 1;
export const MEMBERSHIP_WARN_OVERDUE_MONTHS_MAX = 2;

export type MembershipOverdueLevel = "none" | "warning" | "critical" | "suspended";

export function countOverdueMembershipMonths(
  invoices: Array<{ status: string; amount: number; dueAt: Date }>,
  now = new Date()
) {
  return invoices.filter(
    (invoice) =>
      invoice.status === "PENDING" &&
      invoice.amount > 0 &&
      invoice.dueAt < now
  ).length;
}

export function resolveMembershipOverdueLevel(
  overdueMonths: number
): MembershipOverdueLevel {
  if (overdueMonths >= MEMBERSHIP_SUSPEND_AFTER_OVERDUE_MONTHS) {
    return "suspended";
  }
  if (overdueMonths === 3) {
    return "critical";
  }
  if (
    overdueMonths >= MEMBERSHIP_WARN_OVERDUE_MONTHS_MIN &&
    overdueMonths <= MEMBERSHIP_WARN_OVERDUE_MONTHS_MAX
  ) {
    return "warning";
  }
  return "none";
}

export function formatMembershipFee(amountCents: number, currency: string) {
  const value = (amountCents / 100).toFixed(2);
  return currency === "USD" ? `$${value}` : `${value} ${currency}`;
}

export function isMembershipBillingSuspension(reason: string | null | undefined) {
  return (
    typeof reason === "string" &&
    reason.startsWith("Shop suspended: unpaid marketplace subscription")
  );
}
