import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};

export type AuthResult = {
  user: AuthenticatedUser;
  tokens: AuthTokens;
};
