import { PrismaPg } from "@prisma/adapter-pg";
import type { DependencyReadiness } from "@autobracket/contracts";

import { PrismaClient } from "./generated/prisma/client.js";
import { readDatabaseUrl } from "./environment.js";

export function createPrismaClient(databaseUrl: string = readDatabaseUrl()): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    max: 10,
  });

  return new PrismaClient({ adapter });
}

export async function checkDatabaseReadiness(
  databaseUrl: string = readDatabaseUrl(),
): Promise<DependencyReadiness> {
  const startedAt = performance.now();
  let client: PrismaClient | undefined;

  try {
    client = createPrismaClient(databaseUrl);
    const [schema] = await client.$queryRaw<Array<{ schemaReady: boolean }>>`
      SELECT
        to_regclass('_prisma_migrations') IS NOT NULL
        AND to_regclass('users') IS NOT NULL
        AND to_regclass('sport_presets') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
        ) AS "schemaReady"
    `;

    if (!schema?.schemaReady) {
      throw new Error("The required database schema is not available.");
    }

    return {
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      name: "postgresql",
      status: "ok",
    };
  } catch {
    return {
      errorCode: "DATABASE_UNAVAILABLE",
      name: "postgresql",
      status: "error",
    };
  } finally {
    await client?.$disconnect().catch(() => undefined);
  }
}

export type { PrismaClient } from "./generated/prisma/client.js";
