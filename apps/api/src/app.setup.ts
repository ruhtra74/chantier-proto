import type { NestExpressApplication } from "@nestjs/platform-express";

/**
 * Réglages communs au serveur et aux tests : préfixe `/api`, taille du corps JSON (un journal de
 * partie longue dépasse la limite par défaut de 100 Ko) et arrêt propre de Prisma.
 */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix("api");
  app.useBodyParser("json", { limit: "1mb" });
  app.enableShutdownHooks();
}
