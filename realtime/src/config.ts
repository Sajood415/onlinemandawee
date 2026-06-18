function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? "3100");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("Invalid PORT");
    process.exit(1);
  }
  return port;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  realtimeInternalSecret: required("REALTIME_INTERNAL_SECRET"),
  corsOrigins: (process.env.REALTIME_CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};
