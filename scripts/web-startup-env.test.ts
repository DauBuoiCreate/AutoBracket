import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { pnpmInvocation } from "./pnpm-invocation.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");

describe("web process environment validation", () => {
  it("fails before becoming ready when startup environment is invalid", async () => {
    const result = await new Promise<{ code: number | null; output: string }>(
      (resolveResult, reject) => {
        const invocation = pnpmInvocation(["--filter", "@autobracket/web", "dev"]);
        const child = spawn(invocation.command, invocation.args, {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            PUBLIC_URL: "not-a-url",
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("Next.js did not reject the invalid startup environment"));
        }, 10_000);

        child.stdout.on("data", (chunk) => {
          output += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
          output += String(chunk);
        });
        child.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.once("exit", (code) => {
          clearTimeout(timeout);
          resolveResult({ code, output });
        });
      },
    );

    expect(result.code).not.toBe(0);
    expect(result.output).toContain("PUBLIC_URL");
    expect(result.output).not.toContain("Ready in");
  }, 15_000);
});
