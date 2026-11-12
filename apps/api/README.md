# API (NestJS + Prisma)

Serveur du prototype (étape 8). Il expose les scénarios et enregistre les sessions terminées, après
les avoir **rejouées** avec le même paquet `@chantier/domain` que le navigateur.

## Démarrer

Depuis la racine du monorepo :

```bash
pnpm --filter api dev       # build du domaine, client Prisma, migrations, puis nest start --watch
```

L'API écoute sur http://localhost:3000/api (`PORT` pour changer de port). La base SQLite est
`apps/api/data/dev.db` (ignorée par Git), créée et migrée automatiquement par `predev` ;
`DATABASE_URL` permet d'en viser une autre.

```bash
pnpm --filter api test                  # Vitest + Supertest, base data/test.db recréée à chaque fois
pnpm --filter api build && pnpm --filter api start   # dist/main.js
pnpm --filter api db:migrate            # après une modification de prisma/schema.prisma
```

## Production

`pnpm --filter api start` (après `pnpm build` et `db:deploy`) sert aussi le front Angular compilé
s'il existe (`src/web-app.ts`) : routes du routeur Angular renvoyées vers `index.html`, compression
gzip, cache d'un an pour les fichiers hashés. Image Docker : `Dockerfile` à la racine du dépôt.

## Routes (préfixe `/api`)

| Méthode et chemin    | Rôle                                         | Réponse                                                                |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /scenarios/:id` | Scénario validé (issu du paquet `domain`)    | 200, 404 si inconnu                                                    |
| `POST /sessions`     | Enregistre une session (`SessionSubmission`) | 201 `{ id, serverScore, verified, status, reason }`, 400               |
| `GET /sessions`      | Liste, la plus récente d'abord               | 200 `[{ id, createdAt, scenarioId, status, reason, score, verified }]` |
| `GET /sessions/:id`  | Détail, journal d'événements compris         | 200, 404                                                               |

Les formes des réponses sont définies dans le paquet `domain` (`sessionCreatedSchema`,
`sessionSummarySchema`, `sessionDetailSchema`) : le front les valide avec ces mêmes schémas.

## Vérification par rejeu

`src/sessions/verify-session.ts` rejoue `events` avec `replay()` du domaine, puis compare au
résultat annoncé par le client : `verified` est vrai si le statut, la raison et le score sont
identiques. Le statut, la raison et `serverScore` enregistrés sont ceux du serveur, qui font foi.

- Score ou raison falsifiés : session **enregistrée** avec `verified = false`.
- Corps invalide (schéma Zod `sessionSubmissionSchema`), scénario ou version inconnus, `CONE_HIT`
  vers un cône absent du scénario : **400**, rien n'est enregistré.
- Événements postérieurs à la fin : ignorés, comme dans le domaine.

## Organisation

```
apps/api/
├─ prisma/schema.prisma        modèle Session (section 6.5) ; migrations dans prisma/migrations
├─ prisma.config.ts            configuration Prisma 7 (URL de la base via src/database-url.ts)
├─ src/
│  ├─ main.ts, app.setup.ts    démarrage ; préfixe /api et limite JSON partagés avec les tests
│  ├─ common/zod-validation.pipe.ts   tube de validation Zod réutilisable
│  ├─ prisma/                  PrismaService (adaptateur better-sqlite3), module global
│  ├─ scenarios/               GET /scenarios/:id
│  ├─ sessions/                contrôleur, service, vérification par rejeu
│  └─ generated/prisma/        client généré par `prisma generate` (ignoré par Git)
└─ test/                       tests unitaires du rejeu et tests d'API A1–A6
```
