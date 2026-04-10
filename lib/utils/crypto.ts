import { createHash, randomInt, randomUUID, timingSafeEqual } from "crypto";

export const sha256 = (value: string) => {
  return createHash("sha256").update(value).digest("hex");
};

export const generateOtpCode = () => {
  return randomInt(100000, 1000000).toString();
};

export const generateOpaqueToken = () => {
  return randomUUID();
};

export const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};
