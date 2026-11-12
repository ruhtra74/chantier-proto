import { fileURLToPath } from "node:url";

/**
 * URL SQLite de la base : `DATABASE_URL` si elle est définie, sinon `apps/api/data/dev.db`.
 * Partagée par `prisma.config.ts` (CLI) et `PrismaService` (exécution) pour viser le même fichier,
 * quel que soit le répertoire courant.
 */
export function databaseUrl(): string {
  const fromEnv = process.env["DATABASE_URL"];
  if (fromEnv) return fromEnv;
  const file = fileURLToPath(new URL("../data/dev.db", import.meta.url));
  return `file:${file}`;
}
