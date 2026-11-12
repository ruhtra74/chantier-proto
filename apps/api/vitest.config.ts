import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDatabase = fileURLToPath(new URL("./data/test.db", import.meta.url));

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Base SQLite dédiée, recréée et migrée avant la suite (voir test/global-setup.ts).
    env: { DATABASE_URL: `file:${testDatabase}` },
    globalSetup: ["test/global-setup.ts"],
    // Une seule base partagée : les fichiers de test s'exécutent l'un après l'autre.
    fileParallelism: false,
  },
});
