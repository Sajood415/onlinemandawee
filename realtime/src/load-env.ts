import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const realtimeDir = path.dirname(fileURLToPath(import.meta.url));
const realtimeRoot = path.resolve(realtimeDir, "..");
const appRoot = path.resolve(realtimeRoot, "..");

const candidates = [
  path.join(appRoot, ".env.local"),
  path.join(appRoot, ".env"),
  path.join(realtimeRoot, ".env.local"),
  path.join(realtimeRoot, ".env"),
];

for (const filePath of candidates) {
  if (!existsSync(filePath)) continue;
  loadDotenv({ path: filePath, override: false });
}
