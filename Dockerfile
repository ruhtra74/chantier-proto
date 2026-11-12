# Image de production du prototype (étape 10.6) : l'API NestJS sert aussi le front Angular.
#   docker compose up --build   →   http://localhost:3000

FROM node:24-slim AS build
# better-sqlite3 se compile à l'installation.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
# Paquet api autonome : dépendances de production seulement, @chantier/domain compris.
RUN pnpm --filter api deploy --prod --legacy /out/api

FROM node:24-slim
WORKDIR /app
COPY --from=build /out/api ./api
COPY --from=build /repo/apps/web/dist/web/browser ./web
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST_DIR=/app/web \
    DATABASE_URL=file:/data/chantier.db
VOLUME /data
EXPOSE 3000
WORKDIR /app/api
# Applique les migrations versionnées puis démarre le serveur.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
