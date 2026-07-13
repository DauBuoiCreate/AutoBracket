import type { DependencyReadiness } from "@autobracket/contracts";
import { createClient } from "redis";

const REDIS_CONNECT_TIMEOUT_MS = 2_000;

export async function checkRedisReadiness(redisUrl: string): Promise<DependencyReadiness> {
  const startedAt = performance.now();
  let client: ReturnType<typeof createClient> | undefined;

  try {
    client = createClient({
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: false,
      },
      url: redisUrl,
    });
    client.on("error", () => undefined);

    await client.connect();
    await client.ping();

    return {
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      name: "redis",
      status: "ok",
    };
  } catch {
    return {
      errorCode: "REDIS_UNAVAILABLE",
      name: "redis",
      status: "error",
    };
  } finally {
    if (client?.isOpen) {
      client.destroy();
    }
  }
}
