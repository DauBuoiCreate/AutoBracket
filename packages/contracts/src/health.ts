export type HealthStatus = "ok";

export interface HealthPayload {
  readonly service: "web" | "realtime" | "worker";
  readonly status: HealthStatus;
  readonly timestamp: string;
}

export function createHealthPayload(
  service: HealthPayload["service"],
  now: Date = new Date(),
): HealthPayload {
  return {
    service,
    status: "ok",
    timestamp: now.toISOString(),
  };
}
