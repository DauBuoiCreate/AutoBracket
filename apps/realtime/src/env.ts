import { z } from "zod";

export const REALTIME_STARTUP_DIAGNOSTIC_FIELDS = [
  "LOG_LEVEL",
  "NODE_ENV",
  "REALTIME_PORT",
  "REDIS_URL",
  "RELEASE_VERSION",
] as const;

const realtimeEnvironmentSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REALTIME_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  RELEASE_VERSION: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9._-]+$/u)
    .default("development"),
  REDIS_URL: z
    .url()
    .refine(
      (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
      "REDIS_URL must use the Redis protocol",
    )
    .default("redis://localhost:57379"),
});

export function readRealtimeEnvironment(source: NodeJS.ProcessEnv = process.env) {
  return realtimeEnvironmentSchema.parse(source);
}
