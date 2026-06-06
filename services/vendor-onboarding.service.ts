import { env } from "@/config/env";
import { verifyOtpProofToken } from "@/lib/auth/otp-proof";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { buildVendorReviewStatusEmailHtml } from "@/lib/mail/vendor-review-status-email-html";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { slugify } from "@/lib/utils/slug";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VendorAddressRepository } from "@/repositories/vendor-address.repository";
import { VendorAgreementAcceptanceRepository } from "@/repositories/vendor-agreement-acceptance.repository";
import { VendorKycDocumentRepository } from "@/repositories/vendor-kyc-document.repository";
import { VendorPayoutMethodRepository } from "@/repositories/vendor-payout-method.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { AuthService, type RequestMetadata } from "@/services/auth.service";
import {
  startVendorOnboardingSchema,
  vendorAddressSchema,
  vendorAgreementsSchema,
  vendorKycSchema,
  vendorPayoutSchema,
  vendorStoreInformationSchema,
} from "@/validators/vendor.validator";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { z } from "zod";

type StartVendorOnboardingInput = z.infer<typeof startVendorOnboardingSchema>;
type StoreInformationInput = z.infer<typeof vendorStoreInformationSchema>;
type KycInput = z.infer<typeof vendorKycSchema>;
type AddressInput = z.infer<typeof vendorAddressSchema>;
type PayoutInput = z.infer<typeof vendorPayoutSchema>;
type AgreementInput = z.infer<typeof vendorAgreementsSchema>;

export class VendorOnboardingService {
  constructor(
    private readonly authService = new AuthService(),
    private readonly userRepository = new UserRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly vendorKycDocumentRepository = new VendorKycDocumentRepository(),
    private readonly vendorAddressRepository = new VendorAddressRepository(),
    private readonly vendorPayoutMethodRepository = new VendorPayoutMethodRepository(),
    private readonly vendorAgreementAcceptanceRepository = new VendorAgreementAcceptanceRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async start(input: StartVendorOnboardingInput, metadata: RequestMetadata) {
    const proof = await verifyOtpProofToken(input.verificationToken);

    if (
      proof.purpose !== "VENDOR_SIGNUP" ||
      proof.sub !== normalizeEmailForAuth(input.email)
    ) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Email verification is invalid for vendor onboarding",
        statusCode: 401,
      });
    }

    await this.authService.assertSignupIdentifiersAvailable({
      email: input.email,
      phone: input.phone,
    });

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.createVendor({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
    });
    const vendorProfile = await this.vendorProfileRepository.create({
      userId: user.id,
    });
    const auth = await this.authService.issueSessionTokensForUser(user, metadata);

    await this.auditLogRepository.create({
      actorUserId: user.id,
      actorRole: user.role,
      action: "vendor.onboarding_started",
      entityType: "VendorProfile",
      entityId: vendorProfile.id,
      ipAddress: metadata.ipAddress ?? undefined,
      userAgent: metadata.userAgent ?? undefined,
    });

    return {
      ...auth,
      vendor: {
        id: vendorProfile.id,
        status: vendorProfile.status,
        onboardingStep: vendorProfile.onboardingStep,
      },
    };
  }

  async saveStoreInformation(auth: AuthenticatedUser, input: StoreInformationInput) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);
    const storeSlug = await this.buildUniqueStoreSlug(input.storeName, vendorProfile.id);

    const updated = await this.vendorProfileRepository.updateStoreInformation({
      vendorProfileId: vendorProfile.id,
      storeName: input.storeName,
      storeSlug,
      businessType: input.businessType,
      industryType: input.industryType,
      logoUrl: input.logoUrl,
      description: input.description,
      onboardingStep: "IDENTITY_VERIFICATION",
      status: vendorProfile.status === "REJECTED" ? "ONBOARDING" : vendorProfile.status,
      rejectionReason: null,
      rejectedAt: null,
    });

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
      storeSlug: updated.storeSlug,
    };
  }

  async saveKyc(auth: AuthenticatedUser, input: KycInput) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);

    await this.vendorKycDocumentRepository.upsert({
      vendorProfileId: vendorProfile.id,
      documentType: input.documentType,
      documentUrl: input.documentUrl,
      selfieWithIdUrl: input.selfieWithIdUrl,
    });

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendorProfile.id,
      onboardingStep: "ADDRESS_CONTACT",
      status: vendorProfile.status === "REJECTED" ? "ONBOARDING" : vendorProfile.status,
      rejectionReason: null,
      rejectedAt: null,
    });

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
    };
  }

  async saveAddress(auth: AuthenticatedUser, input: AddressInput) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);

    await this.vendorAddressRepository.upsert({
      vendorProfileId: vendorProfile.id,
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      proofOfAddressUrl: input.proofOfAddressUrl,
    });

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendorProfile.id,
      onboardingStep: "PAYOUT_INFORMATION",
      status: vendorProfile.status === "REJECTED" ? "ONBOARDING" : vendorProfile.status,
      rejectionReason: null,
      rejectedAt: null,
    });

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
    };
  }

  async savePayout(auth: AuthenticatedUser, input: PayoutInput) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);

    await this.vendorPayoutMethodRepository.upsert({
      vendorProfileId: vendorProfile.id,
      method: input.method,
      accountName: input.accountName ?? null,
      accountNumberOrIban: input.accountNumberOrIban ?? null,
      bankName: input.bankName ?? null,
      stripeEmail: input.stripeEmail ?? null,
    });

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendorProfile.id,
      onboardingStep: "AGREEMENTS",
      status: vendorProfile.status === "REJECTED" ? "ONBOARDING" : vendorProfile.status,
      rejectionReason: null,
      rejectedAt: null,
    });

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
    };
  }

  async saveAgreements(auth: AuthenticatedUser, input: AgreementInput) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);

    await this.vendorAgreementAcceptanceRepository.upsert({
      vendorProfileId: vendorProfile.id,
      agreedToVendorTerms: input.agreedToVendorTerms,
      agreedToMembershipPolicy: input.agreedToMembershipPolicy,
      agreedToCommissionPolicy: input.agreedToCommissionPolicy,
      agreedToDisputePolicy: input.agreedToDisputePolicy,
      agreedToDeliveryRules: input.agreedToDeliveryRules,
    });

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendorProfile.id,
      onboardingStep: "SUBMITTED",
      status: vendorProfile.status === "REJECTED" ? "ONBOARDING" : vendorProfile.status,
      rejectionReason: null,
      rejectedAt: null,
    });

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
    };
  }

  async submit(auth: AuthenticatedUser) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    this.assertEditable(vendorProfile.status);

    if (!vendorProfile.storeName || !vendorProfile.storeSlug || !vendorProfile.businessType) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Store information is incomplete",
        statusCode: 400,
      });
    }

    if (vendorProfile.kycDocuments.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "KYC documents are required",
        statusCode: 400,
      });
    }

    if (!vendorProfile.address) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Address information is required",
        statusCode: 400,
      });
    }

    if (!vendorProfile.payoutMethod) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payout information is required",
        statusCode: 400,
      });
    }

    if (!vendorProfile.agreementAcceptance) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Agreements must be accepted",
        statusCode: 400,
      });
    }

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId: vendorProfile.id,
      onboardingStep: "SUBMITTED",
      status: "PENDING_APPROVAL",
      submittedAt: new Date(),
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      suspendedAt: null,
      suspensionReason: null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.submitted_for_approval",
      entityType: "VendorProfile",
      entityId: vendorProfile.id,
    });

    try {
      const recipientName = vendorProfile.user.fullName.trim();
      const storeLabel = vendorProfile.storeName ?? "your store";
      await sendTransactionalEmail({
        to: vendorProfile.user.email,
        subject: `${env.APP_NAME} — We received your vendor application`,
        text: [
          `Hi ${recipientName},`,
          "",
          `Thank you for submitting your vendor application for "${storeLabel}" on ${env.APP_NAME}.`,
          "",
          "We have received your complete application and our team will review it shortly.",
          "We will email you again when there is an update on your application.",
          "",
          `${env.APP_NAME} Team`,
        ].join("\n"),
        html: buildVendorReviewStatusEmailHtml({
          appName: env.APP_NAME,
          heading: "We received your application",
          message: `Thank you for submitting your vendor application for "${storeLabel}". We have received everything and our team will review it shortly. We will email you again when there is an update.`,
          note: "You do not need to reply to this message.",
        }),
      });
    } catch {
      /* Submission already persisted; avoid failing the request if mail fails */
    }

    return {
      id: updated.id,
      onboardingStep: updated.onboardingStep,
      status: updated.status,
      submittedAt: updated.submittedAt?.toISOString() ?? null,
    };
  }

  async getStatus(auth: AuthenticatedUser) {
    const vendorProfile = await this.getVendorProfileByUserId(auth.id);
    const kycDoc = vendorProfile.kycDocuments[0];

    return {
      id: vendorProfile.id,
      user: {
        id: vendorProfile.user.id,
        fullName: vendorProfile.user.fullName,
        email: vendorProfile.user.email,
        phone: vendorProfile.user.phone,
        status: vendorProfile.user.status,
      },
      storeName: vendorProfile.storeName,
      storeSlug: vendorProfile.storeSlug,
      businessType: vendorProfile.businessType,
      industryType: vendorProfile.industryType,
      onboardingStep: vendorProfile.onboardingStep,
      status: vendorProfile.status,
      submittedAt: vendorProfile.submittedAt?.toISOString() ?? null,
      approvedAt: vendorProfile.approvedAt?.toISOString() ?? null,
      rejectedAt: vendorProfile.rejectedAt?.toISOString() ?? null,
      rejectionReason: vendorProfile.rejectionReason,
      completeness: {
        hasStoreInformation: Boolean(
          vendorProfile.storeName && vendorProfile.storeSlug && vendorProfile.businessType
        ),
        hasKyc: vendorProfile.kycDocuments.length > 0,
        hasAddress: Boolean(vendorProfile.address),
        hasPayoutMethod: Boolean(vendorProfile.payoutMethod),
        hasAgreements: Boolean(vendorProfile.agreementAcceptance),
      },
      draft: {
        storeName: vendorProfile.storeName ?? "",
        businessType: vendorProfile.businessType,
        industryType: vendorProfile.industryType,
        logoUrl: vendorProfile.logoUrl ?? "",
        description: vendorProfile.description ?? "",
        kyc: kycDoc
          ? {
              documentType: kycDoc.documentType,
              documentUrl: kycDoc.documentUrl,
              selfieWithIdUrl: kycDoc.selfieWithIdUrl ?? "",
            }
          : null,
        address: vendorProfile.address
          ? {
              addressLine1: vendorProfile.address.addressLine1,
              city: vendorProfile.address.city,
              country: vendorProfile.address.country,
              postalCode: vendorProfile.address.postalCode,
              proofOfAddressUrl: vendorProfile.address.proofOfAddressUrl ?? "",
            }
          : null,
        payout: vendorProfile.payoutMethod
          ? {
              method: vendorProfile.payoutMethod.method,
              accountName: vendorProfile.payoutMethod.accountName ?? "",
              accountNumberOrIban: vendorProfile.payoutMethod.accountNumberOrIban ?? "",
              bankName: vendorProfile.payoutMethod.bankName ?? "",
              stripeEmail: vendorProfile.payoutMethod.stripeEmail ?? "",
            }
          : null,
        agreements: vendorProfile.agreementAcceptance
          ? {
              agreedToVendorTerms: vendorProfile.agreementAcceptance.agreedToVendorTerms,
              agreedToMembershipPolicy: vendorProfile.agreementAcceptance.agreedToMembershipPolicy,
              agreedToCommissionPolicy: vendorProfile.agreementAcceptance.agreedToCommissionPolicy,
              agreedToDisputePolicy: vendorProfile.agreementAcceptance.agreedToDisputePolicy,
              agreedToDeliveryRules: vendorProfile.agreementAcceptance.agreedToDeliveryRules,
            }
          : null,
      },
    };
  }

  private async getVendorProfileByUserId(userId: string) {
    const vendorProfile = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendorProfile) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    return vendorProfile;
  }

  private async buildUniqueStoreSlug(storeName: string, vendorProfileId: string) {
    const baseSlug = slugify(storeName);

    if (!baseSlug) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid store name",
        statusCode: 400,
      });
    }

    const existing = await this.vendorProfileRepository.findByStoreSlug(baseSlug);

    if (!existing || existing.id === vendorProfileId) {
      return baseSlug;
    }

    return `${baseSlug}-${vendorProfileId.slice(-6).toLowerCase()}`;
  }

  private assertEditable(status: string) {
    if (status === "PENDING_APPROVAL" || status === "ACTIVE" || status === "SUSPENDED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Vendor onboarding cannot be edited in the current state",
        statusCode: 400,
      });
    }
  }
}
