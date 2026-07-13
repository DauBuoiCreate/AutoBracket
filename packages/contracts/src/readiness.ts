import { z } from "zod";

import type { HealthPayload } from "./health.js";

export type ReadinessStatus = "ready" | "not_ready";

export type ReadinessDependencyName = "postgresql" | "redis";

export type ReadinessErrorCode = "DATABASE_UNAVAILABLE" | "REDIS_UNAVAILABLE";

export type DependencyReadiness =
  | {
      readonly latencyMs: number;
      readonly name: "postgresql";
      readonly status: "ok";
    }
  | {
      readonly errorCode: "DATABASE_UNAVAILABLE";
      readonly name: "postgresql";
      readonly status: "error";
    }
  | {
      readonly latencyMs: number;
      readonly name: "redis";
      readonly status: "ok";
    }
  | {
      readonly errorCode: "REDIS_UNAVAILABLE";
      readonly name: "redis";
      readonly status: "error";
    };

export interface ReadinessPayload {
  readonly dependencies: readonly DependencyReadiness[];
  readonly service: HealthPayload["service"];
  readonly status: ReadinessStatus;
  readonly timestamp: string;
}

const successfulDependencyShape = {
  latencyMs: z.number().int().nonnegative(),
  status: z.literal("ok"),
} as const;

export const dependencyReadinessSchema: z.ZodType<DependencyReadiness> = z.union([
  z
    .object({
      ...successfulDependencyShape,
      name: z.literal("postgresql"),
    })
    .strict(),
  z
    .object({
      errorCode: z.literal("DATABASE_UNAVAILABLE"),
      name: z.literal("postgresql"),
      status: z.literal("error"),
    })
    .strict(),
  z
    .object({
      ...successfulDependencyShape,
      name: z.literal("redis"),
    })
    .strict(),
  z
    .object({
      errorCode: z.literal("REDIS_UNAVAILABLE"),
      name: z.literal("redis"),
      status: z.literal("error"),
    })
    .strict(),
]);

export const readinessPayloadSchema: z.ZodType<ReadinessPayload> = z
  .object({
    dependencies: z.array(dependencyReadinessSchema).min(1),
    service: z.enum(["web", "realtime", "worker"]),
    status: z.enum(["ready", "not_ready"]),
    timestamp: z.iso.datetime(),
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedStatus = payload.dependencies.every((dependency) => dependency.status === "ok")
      ? "ready"
      : "not_ready";

    if (payload.status !== expectedStatus) {
      context.addIssue({
        code: "custom",
        message: `Status must be ${expectedStatus} for the reported dependencies.`,
        path: ["status"],
      });
    }

    const dependencyNames = payload.dependencies.map((dependency) => dependency.name);
    if (new Set(dependencyNames).size !== dependencyNames.length) {
      context.addIssue({
        code: "custom",
        message: "Each dependency may only be reported once.",
        path: ["dependencies"],
      });
    }
  });

export function createReadinessPayload(
  service: ReadinessPayload["service"],
  dependencies: readonly DependencyReadiness[],
  now: Date = new Date(),
): ReadinessPayload {
  return readinessPayloadSchema.parse({
    dependencies: [...dependencies],
    service,
    status: dependencies.every((dependency) => dependency.status === "ok") ? "ready" : "not_ready",
    timestamp: now.toISOString(),
  });
}
