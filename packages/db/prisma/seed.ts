import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import type { PrismaClient } from "../src/client.js";
import { createPrismaClient } from "../src/client.js";

const draftPresets = [
  { name: "Bóng đá", sportCode: "football" },
  { name: "Bóng chuyền", sportCode: "volleyball" },
  { name: "Cầu lông", sportCode: "badminton" },
] as const;

export async function seedDatabase(client: PrismaClient): Promise<void> {
  for (const preset of draftPresets) {
    await client.sportPreset.upsert({
      create: {
        name: preset.name,
        rules: {
          implementationStatus: "DRAFT_UNTIL_P3",
          schemaVersion: 1,
        },
        sportCode: preset.sportCode,
        status: "DRAFT",
        version: 1,
      },
      update: {},
      where: {
        sportCode_version: {
          sportCode: preset.sportCode,
          version: 1,
        },
      },
    });
  }
}

async function main(): Promise<void> {
  const client = createPrismaClient();
  try {
    await seedDatabase(client);
    console.log("Seeded 3 versioned draft sport presets.");
  } finally {
    await client.$disconnect();
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entrypoint === import.meta.url) {
  await main();
}
