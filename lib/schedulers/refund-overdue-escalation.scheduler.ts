import cron, { type ScheduledTask } from "node-cron";

import { RefundService } from "@/services/refund.service";

const REFUND_OVERDUE_ESCALATION_CRON = "0 * * * *";

declare global {
  // eslint-disable-next-line no-var
  var __refundOverdueEscalationSchedulerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __refundOverdueEscalationSchedulerTask: ScheduledTask | undefined;
}

export function startRefundOverdueEscalationScheduler() {
  if (globalThis.__refundOverdueEscalationSchedulerStarted) {
    return;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const refundService = new RefundService();
  const task = cron.schedule(REFUND_OVERDUE_ESCALATION_CRON, async () => {
    console.info("[refund-overdue-escalation] Hourly execution started");
    try {
      const result = await refundService.runOverdueEscalation();
      console.info("[refund-overdue-escalation] Success", result);
    } catch (error) {
      console.error("[refund-overdue-escalation] Failure", error);
    }
  });

  globalThis.__refundOverdueEscalationSchedulerTask = task;
  globalThis.__refundOverdueEscalationSchedulerStarted = true;
  console.info(
    `[refund-overdue-escalation] Scheduler started (${REFUND_OVERDUE_ESCALATION_CRON})`
  );
}

