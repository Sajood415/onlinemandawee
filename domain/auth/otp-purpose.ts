export const otpPurposes = [
  "CUSTOMER_SIGNUP",
  "VENDOR_SIGNUP",
  "LOGIN",
  "PASSWORD_RESET",
] as const;

export type OtpPurpose = (typeof otpPurposes)[number];
