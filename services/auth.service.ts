import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { AuthResult } from "@/domain/auth/auth-response";
import { verifyOtpProofToken } from "@/lib/auth/otp-proof";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, verifyAuthToken } from "@/lib/auth/jwt";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { durationFromNow } from "@/lib/utils/duration";
import { getClientIpAddress, getUserAgent } from "@/lib/utils/request-metadata";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { SessionRepository } from "@/repositories/session.repository";
import { UserRepository } from "@/repositories/user.repository";

export type RequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type RegisterCustomerInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  verificationToken: string;
};

type LoginInput = {
  identifier: string;
  password: string;
};

type RefreshInput = {
  refreshToken: string;
};

const buildAuthenticatedUser = (input: {
  id: string;
  sessionId: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  email: string;
  phone: string;
  fullName: string;
  status: "ACTIVE" | "PENDING" | "BLOCKED";
}): AuthenticatedUser => {
  return {
    id: input.id,
    sessionId: input.sessionId,
    role: input.role,
    email: input.email,
    phone: input.phone,
    fullName: input.fullName,
    status: input.status,
  };
};

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly sessionRepository = new SessionRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async registerCustomer(input: RegisterCustomerInput, metadata: RequestMetadata) {
    const proof = await verifyOtpProofToken(input.verificationToken);

    if (proof.purpose !== "CUSTOMER_SIGNUP" || proof.sub !== input.phone) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Phone verification is invalid for registration",
        statusCode: 401,
      });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      this.userRepository.findByEmail(input.email),
      this.userRepository.findByPhone(input.phone),
    ]);

    if (existingEmail) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Email is already in use",
        statusCode: 409,
      });
    }

    if (existingPhone) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Phone is already in use",
        statusCode: 409,
      });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.createCustomer({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
    });

    const authResult = await this.createSessionTokens(user, metadata);

    await this.auditLogRepository.create({
      actorUserId: user.id,
      actorRole: user.role,
      action: "auth.customer_registered",
      entityType: "User",
      entityId: user.id,
      ipAddress: metadata.ipAddress ?? undefined,
      userAgent: metadata.userAgent ?? undefined,
      metadata: {
        role: user.role,
      },
    });

    return authResult;
  }

  async login(input: LoginInput, metadata: RequestMetadata) {
    const user = await this.userRepository.findByIdentifier(input.identifier);

    if (!user) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    if (user.status === "BLOCKED") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "User is blocked",
        statusCode: 403,
      });
    }

    await this.userRepository.updateLastLogin(user.id, new Date());
    return this.createSessionTokens(user, metadata);
  }

  async refresh(input: RefreshInput) {
    const payload = await verifyAuthToken(input.refreshToken, "refresh");
    const session = await this.sessionRepository.findActiveById(payload.sid);

    if (!session) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid refresh session",
        statusCode: 401,
      });
    }

    const isValidRefreshToken = await verifyPassword(
      input.refreshToken,
      session.refreshHash
    );

    if (!isValidRefreshToken) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid refresh token",
        statusCode: 401,
      });
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status === "BLOCKED") {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "User is unavailable",
        statusCode: 401,
      });
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
    });
    const refreshToken = await signRefreshToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
    });
    const refreshHash = await hashPassword(refreshToken);

    await this.sessionRepository.updateRefreshHash(
      session.id,
      refreshHash,
      durationFromNow(env.JWT_REFRESH_TTL)
    );

    return {
      user: buildAuthenticatedUser({
        id: user.id,
        sessionId: session.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
      }),
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer" as const,
      },
    } satisfies AuthResult;
  }

  async logout(auth: AuthenticatedUser) {
    await this.sessionRepository.revokeById(auth.sessionId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "auth.logout",
      entityType: "Session",
      entityId: auth.sessionId,
    });

    return {
      success: true,
    };
  }

  getCurrentUser(auth: AuthenticatedUser) {
    return auth;
  }

  static fromRequest(request: Request) {
    return {
      ipAddress: getClientIpAddress(request),
      userAgent: getUserAgent(request),
    };
  }

  issueSessionTokensForUser(
    user: {
      id: string;
      role: "CUSTOMER" | "VENDOR" | "ADMIN";
      email: string;
      phone: string;
      fullName: string;
      status: "ACTIVE" | "PENDING" | "BLOCKED";
    },
    metadata: RequestMetadata
  ) {
    return this.createSessionTokens(user, metadata);
  }

  private async createSessionTokens(
    user: {
      id: string;
      role: "CUSTOMER" | "VENDOR" | "ADMIN";
      email: string;
      phone: string;
      fullName: string;
      status: "ACTIVE" | "PENDING" | "BLOCKED";
    },
    metadata: RequestMetadata
  ) {
    const provisionalRefreshToken = await signRefreshToken({
      sub: user.id,
      sid: "pending",
      role: user.role,
    });

    const provisionalRefreshHash = await hashPassword(provisionalRefreshToken);
    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshHash: provisionalRefreshHash,
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
      expiresAt: durationFromNow(env.JWT_REFRESH_TTL),
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
    });
    const refreshToken = await signRefreshToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
    });
    const refreshHash = await hashPassword(refreshToken);

    await this.sessionRepository.updateRefreshHash(
      session.id,
      refreshHash,
      durationFromNow(env.JWT_REFRESH_TTL)
    );

    return {
      user: buildAuthenticatedUser({
        id: user.id,
        sessionId: session.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
      }),
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer" as const,
      },
    } satisfies AuthResult;
  }
}
