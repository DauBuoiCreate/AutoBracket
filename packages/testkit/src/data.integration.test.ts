import { checkDatabaseReadiness, createPrismaClient } from "@autobracket/db";
import { createClient } from "redis";
import { describe, expect, it } from "vitest";

import { migrateTestDatabase, seedTestDatabase } from "./database-commands.js";
import { withIntegrationServices, withPostgresTestDatabase } from "./integration-services.js";

describe("P0-02 isolated data services", () => {
  it("migrates a blank database, seeds idempotently, and reaches PostgreSQL and Redis", async () => {
    await withIntegrationServices(async ({ databaseUrl, redisUrl }) => {
      expect(await checkDatabaseReadiness(databaseUrl)).toEqual({
        errorCode: "DATABASE_UNAVAILABLE",
        name: "postgresql",
        status: "error",
      });

      await migrateTestDatabase(databaseUrl);

      expect(await checkDatabaseReadiness(databaseUrl)).toMatchObject({
        name: "postgresql",
        status: "ok",
      });

      const database = createPrismaClient(databaseUrl);
      try {
        const appliedMigrations = await database.$queryRaw<
          Array<{ finished_at: Date | null; migration_name: string }>
        >`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY migration_name`;

        expect(appliedMigrations.length).toBeGreaterThan(0);
        expect(appliedMigrations.every((migration) => migration.finished_at instanceof Date)).toBe(
          true,
        );
        expect(await database.sportPreset.count()).toBe(0);

        await seedTestDatabase(databaseUrl);
        const firstSeed = await database.sportPreset.findMany({
          orderBy: [{ sportCode: "asc" }, { version: "asc" }],
        });

        await seedTestDatabase(databaseUrl);
        const secondSeed = await database.sportPreset.findMany({
          orderBy: [{ sportCode: "asc" }, { version: "asc" }],
        });

        expect(secondSeed).toEqual(firstSeed);
        expect(
          secondSeed.map(({ sportCode, status, version }) => ({ sportCode, status, version })),
        ).toEqual([
          { sportCode: "badminton", status: "DRAFT", version: 1 },
          { sportCode: "football", status: "DRAFT", version: 1 },
          { sportCode: "volleyball", status: "DRAFT", version: 1 },
        ]);

        await database.user.create({
          data: {
            displayName: "Isolation sentinel",
            emailNormalized: "isolation-sentinel@example.invalid",
          },
        });

        await withPostgresTestDatabase(async (isolatedDatabase) => {
          await migrateTestDatabase(isolatedDatabase.databaseUrl);
          const isolatedClient = createPrismaClient(isolatedDatabase.databaseUrl);
          try {
            expect(await isolatedClient.user.count()).toBe(0);
            expect(await isolatedClient.sportPreset.count()).toBe(0);
          } finally {
            await isolatedClient.$disconnect();
          }
        });
      } finally {
        await database.$disconnect();
      }

      const redis = createClient({ url: redisUrl });
      redis.on("error", () => undefined);

      try {
        await redis.connect();
        expect(await redis.ping()).toBe("PONG");
        expect(await redis.get("autobracket:test:smoke")).toBeNull();
        await redis.set("autobracket:test:smoke", "reachable", {
          expiration: { type: "EX", value: 30 },
        });
        expect(await redis.get("autobracket:test:smoke")).toBe("reachable");
      } finally {
        if (redis.isOpen) {
          await redis.quit();
        }
      }
    });
  });
});
