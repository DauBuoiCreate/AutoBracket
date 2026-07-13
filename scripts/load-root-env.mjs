import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultEnvironmentPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");

export function loadRootEnvironmentFile(environmentPath = defaultEnvironmentPath) {
  const resolvedPath = resolve(environmentPath);
  if (!existsSync(resolvedPath)) {
    return false;
  }

  loadEnvFile(resolvedPath);
  return true;
}
