import { disputeRoomName } from "@/domain/realtime/dispute-events";
import { publishDisputeEvent } from "@/lib/realtime/publish-dispute-event";

export async function emitDisputeUpdated(input: {
  refundCaseId: string;
  status: string;
  updatedAt: Date;
}) {
  await publishDisputeEvent({
    room: disputeRoomName(input.refundCaseId),
    event: "dispute:updated",
    payload: {
      refundCaseId: input.refundCaseId,
      status: input.status,
      updatedAt: input.updatedAt.toISOString(),
    },
  });
}
