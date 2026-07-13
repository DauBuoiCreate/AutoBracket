import type { NextConfig } from "next";

import { loadRootEnvironmentFile } from "../../scripts/load-root-env.mjs";

import { readWebEnvironment } from "./src/config/env";

loadRootEnvironmentFile();
readWebEnvironment();

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@autobracket/config", "@autobracket/contracts", "@autobracket/ui"],
  typedRoutes: true,
};

export default nextConfig;
