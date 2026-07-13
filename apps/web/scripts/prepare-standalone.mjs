import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const webRoot = resolve(import.meta.dirname, "..");
const standaloneRoot = resolve(webRoot, ".next", "standalone");
const standaloneWebRoot = resolve(standaloneRoot, "apps", "web");
const serverPath = resolve(standaloneWebRoot, "server.js");

if (!existsSync(serverPath)) {
  throw new Error(`Next standalone server was not generated at ${serverPath}.`);
}

const staticSource = resolve(webRoot, ".next", "static");
const staticTarget = resolve(standaloneWebRoot, ".next", "static");
await mkdir(resolve(standaloneWebRoot, ".next"), { recursive: true });
await cp(staticSource, staticTarget, { force: true, recursive: true });

const publicSource = resolve(webRoot, "public");
if (existsSync(publicSource)) {
  await cp(publicSource, resolve(standaloneWebRoot, "public"), {
    force: true,
    recursive: true,
  });
}

await build({
  bundle: true,
  entryPoints: [resolve(webRoot, "scripts", "start-container.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: resolve(standaloneRoot, "start-container.mjs"),
  platform: "node",
  target: "node24",
});

console.log("Prepared Next standalone server with static assets and validated entrypoint.");
