import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";

const POSTGRES_IMAGE = "postgres:18.4-alpine";
const REDIS_IMAGE = "redis:8.8.0-alpine";
const REDIS_PORT = 6379;

interface StoppableService {
  stop(): Promise<unknown>;
}

export interface StartedPostgresTestDatabase {
  readonly databaseUrl: string;
  stop(): Promise<void>;
}

export interface StartedRedisTestService {
  readonly redisUrl: string;
  stop(): Promise<void>;
}

export interface StartedIntegrationServices {
  readonly databaseUrl: string;
  readonly redisUrl: string;
  stop(): Promise<void>;
}

function createIdempotentStop(services: readonly StoppableService[]): () => Promise<void> {
  let stopping: Promise<void> | undefined;

  return () => {
    stopping ??= stopServices(services);
    return stopping;
  };
}

function formatUrlHostname(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

async function stopServices(services: readonly StoppableService[]): Promise<void> {
  const results = await Promise.allSettled(services.map(async (service) => service.stop()));
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );

  if (failures.length > 0) {
    throw new AggregateError(failures, "Failed to stop one or more integration test services.");
  }
}

export async function startPostgresTestDatabase(): Promise<StartedPostgresTestDatabase> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase("autobracket_test")
    .withUsername("autobracket_test")
    .withPassword("autobracket_test")
    .withEnvironment({ TZ: "UTC" })
    .withStartupTimeout(120_000)
    .start();

  return {
    databaseUrl: container.getConnectionUri(),
    stop: createIdempotentStop([container]),
  };
}

export async function startRedisTestService(): Promise<StartedRedisTestService> {
  const container = await new GenericContainer(REDIS_IMAGE)
    .withExposedPorts(REDIS_PORT)
    .withWaitStrategy(Wait.forSuccessfulCommand("redis-cli ping"))
    .withStartupTimeout(120_000)
    .start();

  return {
    redisUrl: `redis://${formatUrlHostname(container.getHost())}:${container.getMappedPort(REDIS_PORT)}`,
    stop: createIdempotentStop([container]),
  };
}

export async function startIntegrationServices(): Promise<StartedIntegrationServices> {
  const [postgresResult, redisResult] = await Promise.allSettled([
    startPostgresTestDatabase(),
    startRedisTestService(),
  ]);

  if (postgresResult.status === "fulfilled" && redisResult.status === "fulfilled") {
    return {
      databaseUrl: postgresResult.value.databaseUrl,
      redisUrl: redisResult.value.redisUrl,
      stop: createIdempotentStop([postgresResult.value, redisResult.value]),
    };
  }

  const startedServices: StoppableService[] = [];
  const startupFailures: unknown[] = [];

  if (postgresResult.status === "fulfilled") {
    startedServices.push(postgresResult.value);
  } else {
    startupFailures.push(postgresResult.reason);
  }

  if (redisResult.status === "fulfilled") {
    startedServices.push(redisResult.value);
  } else {
    startupFailures.push(redisResult.reason);
  }

  const cleanupResult = await Promise.allSettled([stopServices(startedServices)]);
  if (cleanupResult[0]?.status === "rejected") {
    startupFailures.push(cleanupResult[0].reason);
  }

  throw new AggregateError(startupFailures, "Failed to start isolated integration services.");
}

export async function withPostgresTestDatabase<T>(
  run: (database: StartedPostgresTestDatabase) => Promise<T>,
): Promise<T> {
  const database = await startPostgresTestDatabase();

  try {
    return await run(database);
  } finally {
    await database.stop();
  }
}

export async function withIntegrationServices<T>(
  run: (services: StartedIntegrationServices) => Promise<T>,
): Promise<T> {
  const services = await startIntegrationServices();

  try {
    return await run(services);
  } finally {
    await services.stop();
  }
}
