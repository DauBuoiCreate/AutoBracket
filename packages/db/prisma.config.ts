import { defineConfig } from "prisma/config";

import { loadRootEnvironmentFile } from "../../scripts/load-root-env.mjs";

import { LOCAL_DATABASE_URL } from "./src/environment.js";

loadRootEnvironmentFile();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  schema: "prisma/schema.prisma",
});
