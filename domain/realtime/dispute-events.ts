export const DISPUTE_ROOM_PREFIX = "dispute:";

export type DisputeRealtimeEventName = "dispute:message" | "dispute:updated";

export type DisputeMessagePayload = {
  id: string;
  refundCaseId: string;
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

export type DisputeUpdatedPayload = {
  refundCaseId: string;
  status: string;
  updatedAt: string;
};

export type DisputeBroadcastBody = {
  room: string;
  event: DisputeRealtimeEventName;
  payload: DisputeMessagePayload | DisputeUpdatedPayload;
};

export function disputeRoomName(refundCaseId: string) {
  return `${DISPUTE_ROOM_PREFIX}${refundCaseId}`;
}
