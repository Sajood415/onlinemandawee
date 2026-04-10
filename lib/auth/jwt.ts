import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { env } from "@/config/env";
import type { Role } from "@/domain/auth/role";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

type TokenType = "access" | "refresh";

export type AuthTokenPayload = {
  sub: string;
  sid: string;
  role: Role;
  type: TokenType;
};

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const getSecretForTokenType = (type: TokenType) => {
  return type === "access" ? accessSecret : refreshSecret;
};

export const signAuthToken = async (
  payload: AuthTokenPayload,
  expiresIn: string
) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretForTokenType(payload.type));
};

export const verifyAuthToken = async (
  token: string,
  expectedType: TokenType
) => {
  try {
    const { payload } = await jwtVerify(token, getSecretForTokenType(expectedType));

    if (payload.type !== expectedType) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid token type",
        statusCode: 401,
      });
    }

    return payload as AuthTokenPayload;
  } catch {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid or expired token",
      statusCode: 401,
    });
  }
};

export const signAccessToken = (payload: Omit<AuthTokenPayload, "type">) =>
  signAuthToken({ ...payload, type: "access" }, env.JWT_ACCESS_TTL);

export const signRefreshToken = (payload: Omit<AuthTokenPayload, "type">) =>
  signAuthToken({ ...payload, type: "refresh" }, env.JWT_REFRESH_TTL);
