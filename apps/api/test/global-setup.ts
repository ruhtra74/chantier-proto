import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("..", import.meta.url));
const testDatabase = fileURLToPath(new URL("../data/test.db", import.meta.url));

/** Repart d'une base de test vide et lui applique les migrations versionnées. */
export default function setup(): void {
  mkdirSync(dirname(testDatabase), { recursive: true });
  rmSync(testDatabase, { force: true });
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: `file:${testDatabase}` },
    stdio: "pipe",
  });
}
