import { describe, expect, it } from "vitest";

import { StagingEnvironmentError, validateStagingEnvironment } from "./validate-staging-env.mjs";

describe("staging environment validation", () => {
  it("accepts a matching percent-encoded password with URI-reserved characters", () => {
    const password = "p/#? @:%";

    expect(
      validateStagingEnvironment({
        POSTGRES_DB: "custom_db",
        POSTGRES_PASSWORD: password,
        POSTGRES_USER: "custom_user",
        STAGING_DATABASE_URL: `postgresql://custom_user:${encodeURIComponent(password)}@postgres:5432/custom_db`,
      }),
    ).toEqual({ databaseName: "custom_db", databaseUser: "custom_user" });
  });

  it.each([
    {
      expectedCode: "POSTGRES_PASSWORD_REQUIRED",
      source: { STAGING_DATABASE_URL: "postgresql://autobracket:value@postgres:5432/autobracket" },
    },
    {
      expectedCode: "STAGING_DATABASE_URL_REQUIRED",
      source: { POSTGRES_PASSWORD: "value" },
    },
    {
      expectedCode: "STAGING_DATABASE_URL_INVALID",
      source: { POSTGRES_PASSWORD: "value", STAGING_DATABASE_URL: "not-a-url" },
    },
    {
      expectedCode: "STAGING_DATABASE_URL_MISMATCH",
      source: {
        POSTGRES_PASSWORD: "raw-password",
        STAGING_DATABASE_URL:
          "postgresql://autobracket:different-password@postgres:5432/autobracket",
      },
    },
  ])("rejects invalid staging DB configuration with $expectedCode", ({ expectedCode, source }) => {
    expect(() => validateStagingEnvironment(source)).toThrow(
      new StagingEnvironmentError(expectedCode),
    );
  });
});
