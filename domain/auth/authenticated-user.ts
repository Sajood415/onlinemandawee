import type { Role } from "@/domain/auth/role";

export type AuthenticatedUser = {
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  phone: string;
  fullName: string;
  status: "ACTIVE" | "PENDING" | "BLOCKED";
};
