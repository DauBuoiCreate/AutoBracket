export function createFixedClock(isoTimestamp: string): () => Date {
  const timestamp = new Date(isoTimestamp);

  if (Number.isNaN(timestamp.valueOf())) {
    throw new TypeError("isoTimestamp must be a valid ISO-8601 value");
  }

  return () => new Date(timestamp.valueOf());
}

export { migrateTestDatabase, seedTestDatabase } from "./database-commands.js";
export {
  startIntegrationServices,
  startPostgresTestDatabase,
  startRedisTestService,
  withIntegrationServices,
  withPostgresTestDatabase,
} from "./integration-services.js";
export type {
  StartedIntegrationServices,
  StartedPostgresTestDatabase,
  StartedRedisTestService,
} from "./integration-services.js";
