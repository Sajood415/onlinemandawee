import { createHash, randomInt, randomUUID } from "crypto";

export const sha256 = (value: string) => {
  return createHash("sha256").update(value).digest("hex");
};

export const generateOtpCode = () => {
  return randomInt(100000, 1000000).toString();
};

export const generateOpaqueToken = () => {
  return randomUUID();
};
