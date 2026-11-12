import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import type { NextFunction, Request, Response } from "express";

/**
 * Version de production (étape 10.5) : l'API sert aussi le front Angular compilé, sur le même
 * port, ce qui évite tout proxy ou CORS. Les réponses sont compressées (gzip) et les fichiers dont
 * le nom contient un hash Angular sont mis en cache un an (mesures de l'étape 10.4). Le dossier est `WEB_DIST_DIR`, sinon
 * `apps/web/dist/web/browser` ; s'il n'existe pas, l'API démarre seule.
 *
 * @returns le dossier servi, ou `null`.
 */
/** Fichiers produits par Angular avec `outputHashing` : `main-3IWQYSJG.js`, `chunk--DBdsjRK.js`. */
const HASHED_FILE = /-[A-Za-z0-9_-]{8}\.(js|css)$/;

export function serveWebApp(app: NestExpressApplication): string | null {
  const dir =
    process.env["WEB_DIST_DIR"] ??
    fileURLToPath(new URL("../../web/dist/web/browser", import.meta.url));
  const index = join(dir, "index.html");
  if (!existsSync(index)) return null;

  app.use(compression());
  app.useStaticAssets(dir, {
    setHeaders: (res: Response, file: string) => {
      const name = basename(file);
      if (name === "index.html") res.setHeader("Cache-Control", "no-cache");
      else if (HASHED_FILE.test(name)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  });
  // Routes du routeur Angular (/jeu, /fin, /historique…) : renvoyer index.html.
  // Les chemins /api et les fichiers (avec extension) introuvables restent des 404.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || extname(req.path) !== "") {
      next();
      return;
    }
    res.sendFile(index);
  });
  return dir;
}
