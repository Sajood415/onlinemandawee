import "server-only";

import { compare, hash } from "bcryptjs";

import { env } from "@/config/env";

export const hashPassword = (value: string) => {
  return hash(value, env.PASSWORD_HASH_ROUNDS);
};

export const verifyPassword = (value: string, passwordHash: string) => {
  return compare(value, passwordHash);
};
