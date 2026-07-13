import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadRootEnvironmentFile } from "./load-root-env.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  delete process.env.AUTOBRACKET_ENV_LOADER_TEST;
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      const resolvedDirectory = resolve(directory);
      const resolvedTemp = resolve(tmpdir());
      if (!resolvedDirectory.startsWith(`${resolvedTemp}${sep}`)) {
        throw new Error(`Refusing to remove unexpected test path: ${resolvedDirectory}`);
      }
      await rm(resolvedDirectory, { force: true, recursive: true });
    }),
  );
});

describe("loadRootEnvironmentFile", () => {
  it("loads a present environment file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "autobracket-env-"));
    temporaryDirectories.push(directory);
    const environmentPath = join(directory, ".env");
    await writeFile(environmentPath, "AUTOBRACKET_ENV_LOADER_TEST=loaded\n", "utf8");

    expect(loadRootEnvironmentFile(environmentPath)).toBe(true);
    expect(process.env.AUTOBRACKET_ENV_LOADER_TEST).toBe("loaded");
  });

  it("does nothing when the file is absent", () => {
    expect(loadRootEnvironmentFile(join(tmpdir(), "autobracket-env-missing", ".env"))).toBe(false);
  });
});
