import { startRefundOverdueEscalationScheduler } from "@/lib/schedulers/refund-overdue-escalation.scheduler";

startRefundOverdueEscalationScheduler();

console.info("[refund-overdue-escalation] Worker process online");

process.on("SIGINT", () => {
  console.info("[refund-overdue-escalation] Worker stopping (SIGINT)");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("[refund-overdue-escalation] Worker stopping (SIGTERM)");
  process.exit(0);
});

