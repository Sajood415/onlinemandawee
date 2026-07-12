import { startRefundOverdueEscalationScheduler } from "@/lib/schedulers/refund-overdue-escalation.scheduler";

startRefundOverdueEscalationScheduler();

console.info("[refund-overdue-escalation] Worker process online");

