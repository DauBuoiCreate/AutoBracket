import { z } from "zod";

export const WEB_STARTUP_DIAGNOSTIC_FIELDS = [
  "APP_URL",
  "DATABASE_URL",
  "LOG_LEVEL",
  "NODE_ENV",
  "PORT",
  "PUBLIC_URL",
  "REDIS_URL",
  "RELEASE_VERSION",
] as const;

const webEnvironmentSchema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use the PostgreSQL protocol",
    )
    .optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  PUBLIC_URL: z.url().default("http://localhost:3000"),
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

export type WebEnvironment = z.infer<typeof webEnvironmentSchema>;

export function readWebEnvironment(
  source: Record<string, string | undefined> = process.env,
): WebEnvironment {
  return webEnvironmentSchema.parse(source);
}
