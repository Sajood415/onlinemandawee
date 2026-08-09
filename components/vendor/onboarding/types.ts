import type { VendorOnboardingStep } from "@/domain/vendor/vendor-onboarding-step";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import type {
  BusinessType,
  KycDocumentType,
  PayoutMethodType,
} from "@/domain/vendor/vendor-types";

export type OnboardingStatusPayload = {
  onboardingStep: VendorOnboardingStep;
  status: VendorStatus;
  submittedAt: string | null;
  user: { fullName: string; email: string; phone: string | null };
  draft: {
    storeName: string;
    businessType: BusinessType | null;
    industryType: string | null | undefined;
    logoUrl: string;
    description: string;
    businessLicenseUrl: string;
    kyc: null | {
      documentType: KycDocumentType;
      documentUrl: string;
      selfieWithIdUrl: string;
    };
    address: null | {
      addressLine1: string;
      city: string;
      country: string;
      postalCode: string;
      proofOfAddressUrl: string;
    };
    payout: null | {
      method: PayoutMethodType;
      accountName: string;
      accountNumberOrIban: string;
      bankName: string;
      stripeEmail: string;
    };
    agreements: null | {
      agreedToVendorTerms: boolean;
      agreedToMembershipPolicy: boolean;
      agreedToCommissionPolicy: boolean;
      agreedToDisputePolicy: boolean;
      agreedToDeliveryRules: boolean;
    };
  };
};
