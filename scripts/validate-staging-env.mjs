export class StagingEnvironmentError extends Error {
  constructor(code) {
    super(code);
    this.name = "StagingEnvironmentError";
  }
}

function decodeUrlComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new StagingEnvironmentError("STAGING_DATABASE_URL_INVALID");
  }
}

export function validateStagingEnvironment(source = process.env) {
  const databaseName = source.POSTGRES_DB?.trim() || "autobracket";
  const databaseUser = source.POSTGRES_USER?.trim() || "autobracket";
  const databasePassword = source.POSTGRES_PASSWORD;
  const connectionString = source.STAGING_DATABASE_URL;

  if (!databasePassword) {
    throw new StagingEnvironmentError("POSTGRES_PASSWORD_REQUIRED");
  }
  if (!connectionString) {
    throw new StagingEnvironmentError("STAGING_DATABASE_URL_REQUIRED");
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new StagingEnvironmentError("STAGING_DATABASE_URL_INVALID");
  }

  const protocolValid =
    databaseUrl.protocol === "postgresql:" || databaseUrl.protocol === "postgres:";
  const topologyValid =
    databaseUrl.hostname === "postgres" &&
    (databaseUrl.port || "5432") === "5432" &&
    databaseUrl.hash === "" &&
    databaseUrl.search === "";
  const credentialsMatch =
    decodeUrlComponent(databaseUrl.username) === databaseUser &&
    decodeUrlComponent(databaseUrl.password) === databasePassword &&
    decodeUrlComponent(databaseUrl.pathname.slice(1)) === databaseName;

  if (!protocolValid || !topologyValid || !credentialsMatch) {
    throw new StagingEnvironmentError("STAGING_DATABASE_URL_MISMATCH");
  }

  return { databaseName, databaseUser };
}

if (import.meta.main) {
  try {
    validateStagingEnvironment();
    console.log("STAGING_ENV_VALIDATION=PASS");
  } catch (error) {
    console.error(error instanceof StagingEnvironmentError ? error.message : "STAGING_ENV_INVALID");
    process.exitCode = 1;
  }
}
