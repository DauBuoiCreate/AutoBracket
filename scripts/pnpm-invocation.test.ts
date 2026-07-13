import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { pnpmInvocation } from "./pnpm-invocation.mjs";

describe("pnpmInvocation", () => {
  it("prefers the active pnpm CLI", () => {
    const pnpmCli = resolve("D:/tools/pnpm.cjs");

    expect(
      pnpmInvocation(["verify"], {
        environment: { npm_execpath: pnpmCli },
        fileExists: (path: string) => path === pnpmCli,
        nodeExecutable: "D:/runtime/node.exe",
        platform: "win32",
      }),
    ).toEqual({ args: [pnpmCli, "verify"], command: "D:/runtime/node.exe" });
  });

  it("uses a bundled Corepack CLI when pnpm is not active", () => {
    const nodeExecutable = resolve("D:/runtime/node.exe");
    const corepackCli = resolve("D:/runtime/node_modules/corepack/dist/corepack.js");

    expect(
      pnpmInvocation(["install", "--frozen-lockfile"], {
        environment: {},
        fileExists: (path: string) => path === corepackCli,
        nodeExecutable,
        platform: "win32",
      }),
    ).toEqual({
      args: [corepackCli, "pnpm", "install", "--frozen-lockfile"],
      command: nodeExecutable,
    });
  });

  it("uses the POSIX Corepack shim when no bundled CLI exists", () => {
    expect(
      pnpmInvocation(["verify"], {
        environment: {},
        fileExists: () => false,
        nodeExecutable: "/runtime/bin/node",
        platform: "linux",
      }),
    ).toEqual({ args: ["pnpm", "verify"], command: "corepack" });
  });

  it("uses cmd.exe for the Windows Corepack shim", () => {
    expect(
      pnpmInvocation(["--filter", "@autobracket/web", "dev"], {
        environment: { ComSpec: "C:/Windows/System32/cmd.exe" },
        fileExists: () => false,
        nodeExecutable: "D:/runtime/node.exe",
        platform: "win32",
      }),
    ).toEqual({
      args: ["/d", "/s", "/c", "corepack", "pnpm", "--filter", "@autobracket/web", "dev"],
      command: "C:/Windows/System32/cmd.exe",
    });
  });

  it("rejects unsafe Windows shell arguments", () => {
    expect(() =>
      pnpmInvocation(["--filter", "unsafe & command"], {
        environment: {},
        fileExists: () => false,
        nodeExecutable: "D:/runtime/node.exe",
        platform: "win32",
      }),
    ).toThrow("Refusing to pass an unsafe pnpm argument through cmd.exe.");
  });
});
