import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const safeShellArgument = /^[A-Za-z0-9@._:/=+-]+$/u;

function bundledCorepackCandidates(nodeExecutable) {
  const executableDirectory = dirname(nodeExecutable);
  return [
    resolve(executableDirectory, "node_modules", "corepack", "dist", "corepack.js"),
    resolve(executableDirectory, "..", "lib", "node_modules", "corepack", "dist", "corepack.js"),
    resolve(executableDirectory, "..", "node_modules", "corepack", "dist", "corepack.js"),
  ];
}

function isPnpmCli(path) {
  return basename(path).toLowerCase().startsWith("pnpm");
}

export function pnpmInvocation(
  pnpmArguments,
  {
    environment = process.env,
    fileExists = existsSync,
    nodeExecutable = process.execPath,
    platform = process.platform,
  } = {},
) {
  const currentPnpmCli = environment.npm_execpath;
  if (currentPnpmCli && isPnpmCli(currentPnpmCli) && fileExists(currentPnpmCli)) {
    return {
      args: [currentPnpmCli, ...pnpmArguments],
      command: nodeExecutable,
    };
  }

  for (const corepackCli of bundledCorepackCandidates(nodeExecutable)) {
    if (fileExists(corepackCli)) {
      return {
        args: [corepackCli, "pnpm", ...pnpmArguments],
        command: nodeExecutable,
      };
    }
  }

  if (platform === "win32") {
    if (!pnpmArguments.every((argument) => safeShellArgument.test(argument))) {
      throw new Error("Refusing to pass an unsafe pnpm argument through cmd.exe.");
    }
    return {
      args: ["/d", "/s", "/c", "corepack", "pnpm", ...pnpmArguments],
      command: environment.ComSpec ?? environment.COMSPEC ?? "cmd.exe",
    };
  }

  return {
    args: ["pnpm", ...pnpmArguments],
    command: "corepack",
  };
}
