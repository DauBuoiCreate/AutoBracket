import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

type DatabaseScript = "db:migrate" | "db:seed";

function redact(output: string, secret: string): string {
  return output.replaceAll(secret, "[REDACTED_DATABASE_URL]");
}

async function runDatabaseScript(script: DatabaseScript, databaseUrl: string): Promise<void> {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) {
    throw new Error("Database integration commands must be launched from a pnpm script.");
  }

  const child = spawn(process.execPath, [pnpmCli, "--filter", "@autobracket/db", "run", script], {
    cwd: WORKSPACE_ROOT,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });

  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    },
  );

  if (result.code !== 0) {
    const details = redact(output.trim(), databaseUrl);
    throw new Error(
      [
        `pnpm ${script} failed (code=${String(result.code)}, signal=${String(result.signal)}).`,
        details,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

export async function migrateTestDatabase(databaseUrl: string): Promise<void> {
  await runDatabaseScript("db:migrate", databaseUrl);
}

export async function seedTestDatabase(databaseUrl: string): Promise<void> {
  await runDatabaseScript("db:seed", databaseUrl);
}
