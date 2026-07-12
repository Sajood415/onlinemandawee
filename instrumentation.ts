export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { startRefundOverdueEscalationScheduler } = await import(
    "@/lib/schedulers/refund-overdue-escalation.scheduler"
  );
  startRefundOverdueEscalationScheduler();
}

