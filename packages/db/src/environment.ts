import { z } from "zod";

export const LOCAL_DATABASE_URL =
  "postgresql://autobracket:autobracket@localhost:55432/autobracket" as const;

const databaseUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must use the PostgreSQL protocol",
  );

export function readDatabaseUrl(source: NodeJS.ProcessEnv = process.env): string {
  return databaseUrlSchema.parse(source.DATABASE_URL ?? LOCAL_DATABASE_URL);
}
