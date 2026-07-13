import { z } from "zod";

export const WORKER_STARTUP_DIAGNOSTIC_FIELDS = [
  "DATABASE_URL",
  "LOG_LEVEL",
  "NODE_ENV",
  "REDIS_URL",
  "RELEASE_VERSION",
  "WORKER_HEALTH_PORT",
] as const;

const workerEnvironmentSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use the PostgreSQL protocol",
    )
    .optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65_535).default(3002),
});

export function readWorkerEnvironment(source: NodeJS.ProcessEnv = process.env) {
  return workerEnvironmentSchema.parse(source);
}
