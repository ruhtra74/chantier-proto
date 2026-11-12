import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur la **version de production** (étape 10.7) : l'API compilée sert le
 * front compilé sur le port 3100, avec une base SQLite dédiée recréée à chaque lancement.
 * Prérequis : `pnpm build` (fait par `pnpm e2e` à la racine).
 */
const PORT = 3100;
const database = fileURLToPath(new URL("./.data/e2e.db", import.meta.url));
const databaseUrl = `file:${database}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  // Une seule base partagée : les tests s'enchaînent dans l'ordre.
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: undefined } }],
  webServer: {
    // Base vide, migrations appliquées, puis serveur de production.
    command: `rm -f ${database} && pnpm --filter api db:deploy && pnpm --filter api start`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: `http://127.0.0.1:${PORT}/api/sessions`,
    env: { PORT: String(PORT), DATABASE_URL: databaseUrl },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
