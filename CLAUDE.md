# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Prototype technique « un engin sur un chantier » : il valide la chaîne Blender → GLB →
Babylon.js/Havok → Angular, avec un domaine métier pur partagé entre le navigateur et un futur
serveur NestJS qui rejoue les sessions. Le document de conception est
`../simu-3D/prototype_chantier_conception.md` ; le tableau d'avancement par étape se trouve dans
`README.md` (étapes 0 à 10 faites ; restent à l'équipe la mesure sur une seconde machine, les
durées réelles et le report dans le rapport). Bilan : `docs/bilan.md`.

**On travaille en français** : échanges, commentaires, documentation, journal, messages d'erreur et
valeurs du domaine (`"arrivee"`, `"panne_seche"`).

## Commandes

Workspace pnpm 12 (`apps/*`, `packages/*`, `e2e`), Node 24. À lancer depuis la racine :

```bash
pnpm install
pnpm test                 # Vitest, tous les paquets (domain, api)
pnpm typecheck
pnpm lint                 # ESLint sur tout le dépôt
pnpm format / format:check
pnpm build

pnpm --filter web start                   # serveur Angular, http://localhost:4200
pnpm --filter api dev                     # API NestJS, http://localhost:3000/api
pnpm --filter @chantier/domain dev        # tsup --watch pendant qu'on modifie le domaine
pnpm --filter @chantier/domain exec vitest run tests/reducer.test.ts   # un seul fichier de test
pnpm --filter @chantier/domain exec vitest run -t "nom du test"        # un seul test par son nom
pnpm --filter api exec vitest run test/api.test.ts                     # idem côté API
pnpm --filter api db:migrate              # après modification de prisma/schema.prisma

pnpm decouplage                           # partie sur le domaine seul (scripts/decouplage.mjs)
pnpm e2e                                  # pnpm build + Playwright (serveur de prod lancé sur :3100)
pnpm --filter e2e exec playwright test -g "historique"   # un seul test e2e (après pnpm build)
pnpm mesures:fps [--gpu dedie] [--sans-vsync]            # nécessite le serveur de prod sur :3000
pnpm mesures:chargement
pnpm build && pnpm --filter api db:deploy && pnpm --filter api start   # prod : http://localhost:3000
docker compose up --build                                              # idem en conteneur
```

- `pnpm test` ne lance pas Playwright (le script du paquet `e2e` s'appelle `e2e`, pas `test`).
- Les tests e2e tournent sur la **version compilée** : après une modification du front ou de
  l'API, refaire `pnpm build` (ce que fait `pnpm e2e`).

- Les scripts `pre*` d'`apps/api` recompilent le domaine et lancent `prisma generate` (client
  généré dans `apps/api/src/generated/`, ignoré par Git) ; `predev` applique aussi les migrations.
  Les tests d'API utilisent `apps/api/data/test.db`, recréée par `test/global-setup.ts` ; la base de
  développement est `apps/api/data/dev.db` (`DATABASE_URL` pour en changer).
- Angular consomme `@chantier/domain` depuis son `dist/` (les exports pointent dessus), jamais
  depuis les sources. Les scripts `prestart`/`prebuild` d'`apps/web` recompilent le domaine et
  copient le WASM de Havok dans `apps/web/public/havok/` (ignoré par Git). Si le front voit une
  ancienne version du domaine, recompiler le domaine.
- `pnpm --filter web start -- --port …` passe un `--` de trop au CLI ; utiliser plutôt
  `pnpm --filter web exec ng serve --port 4200 --host 127.0.0.1`.
- pnpm applique un âge minimal de publication : ne pas ajouter de `minimumReleaseAgeExclude`,
  choisir plutôt la version précédente (c'est pourquoi NestJS est en 12.4.2).
- Les versions des dépendances sont figées (`savePrefix: ""` dans `pnpm-workspace.yaml`) ; tout
  nouveau script postinstall natif doit être autorisé sous `allowBuilds` dans ce même fichier.
- Assets : `blender --background --factory-startup --python blender/build_assets.py` régénère les
  `.blend` et `apps/web/public/models/*.glb` ; `node blender/verify_glb.mjs <glb…>` les contrôle.
  Les conventions de nommage et d'axes sont dans `blender/README.md` (parent `engin` avec `corps`,
  `cabine`, `roue_AVG/AVD/ARG/ARD` ; l'avant est en −Y dans Blender, soit +Z dans Babylon). Remplacer
  les GLB en respectant ces conventions ne demande aucun changement de code.

## Formatage

Deux configurations Prettier : la racine (`printWidth 100`, guillemets doubles) et
`apps/web/.prettierrc` (guillemets simples, parseur Angular pour le HTML). Respecter le style du
paquet modifié.

## Architecture

Couches pilotées par événements, avec un seul point de rencontre :

```
Moteur Babylon/Havok ──EngineEvent──▶ GameController ──reduce()──▶ @chantier/domain
  (apps/web/.../engine/)               (game-controller.ts)          (packages/domain)
        ▲                                     │
        └──────── DomainCommand (END) ────────┤──▶ HUD (UPDATE_HUD), GameSessionService → /fin
```

- **`packages/domain`** — règles pures : schémas Zod (`schemas.ts`, types déduits dans `types.ts`),
  `createInitialState`, `computeScore`, `reduce(état, événement, scénario) → { state, commands }`,
  `replay`, et le scénario `chantier-1` (JSON validé au chargement). Il doit rester déterministe :
  ni horloge, ni aléatoire, ni import 3D/interface/réseau/Node — imposé par `no-restricted-imports`
  dans `eslint.config.mjs`. Invariants : un `CONE_HIT` répété ou inconnu est ignoré ; les
  événements reçus après la fin sont ignorés. Le même réducteur et le même score serviront au
  serveur pour rejouer les journaux : toute modification d'une règle doit garder des résultats
  identiques entre navigateur et rejeu.
- **Contrats** : `EngineEvent` = `MOVED {distance}` | `CONE_HIT {id}` | `REACHED_TARGET` ;
  `DomainCommand` = `UPDATE_HUD {fuel, conesHit, distance}` | `END {reason, score}`.
- **`apps/web/src/app/game/engine/`** — scène Babylon, chargement des assets, physique Havok,
  contrôleur de l'engin, clavier, caméra de poursuite, inspecteur. **Aucune règle métier** : ce
  code ne fait qu'émettre des `EngineEvent` (`MOVED` par lots, 10 Hz au plus ; `flushMoved()` émet
  le reliquat à l'arrêt).
- **`game-controller.ts`** — seul endroit où les couches se rencontrent ; ne connaît ni Babylon ni
  Angular. Il horodate les événements (`event-log.ts`, horloge injectable) et construit la
  `SessionSubmission` destinée à la future API.
- **`game-canvas.component.ts`** — gère le cycle de vie du moteur : crée et détruit l'`Engine`
  Babylon, branche l'engin sur le contrôleur, publie l'issue dans `GameSessionService` (fourni à la
  racine, il survit à la navigation) puis ouvre `/fin`. Un compteur de génération invalide les
  chargements Havok/GLB asynchrones devenus périmés après un redémarrage ; une garde `ended`
  empêche une double navigation.
- **`apps/api`** — NestJS 12 (**ESM uniquement** : imports relatifs suffixés `.js`, module
  `NodeNext`), Prisma 7 (générateur `prisma-client`, adaptateur `better-sqlite3`, URL fournie par
  `prisma.config.ts` → `src/database-url.ts`). `SessionsService` délègue à `verify-session.ts`,
  fonction pure qui rejoue le journal avec `replay()` du domaine : falsification → enregistrée avec
  `verified = false` ; corps invalide, scénario inconnu ou cône inconnu → 400. Les corps sont validés
  par `ZodValidationPipe` avec les schémas du domaine (pas de class-validator). `app.setup.ts`
  (préfixe `/api`, limite JSON 1 Mo) est partagé entre `main.ts` et les tests.
- **`apps/web/src/app/api/`** — accès à l'API : `ApiService` (chemins relatifs `/api`, proxy de
  développement `proxy.conf.json` vers le port 3000 ; réponses validées par les schémas Zod du
  domaine, erreurs `ApiError` : `unreachable` = réseau/délai/5xx, à réessayer ; `rejected` = 4xx,
  abandon), `ScenarioService` (scénario de l'API, copie du domaine en secours) et
  `SessionSyncService` (chaque session est d'abord écrite dans `localStorage`, puis envoyée ;
  nouvel essai au démarrage via `provideAppInitializer`, à chaque `NavigationEnd` et sur
  `online`). Les contrats de réponse (`sessionCreatedSchema`, etc.) vivent dans le domaine et
  typent aussi l'API.
- Routes du front : `/` accueil, `/jeu` partie, `/fin` écran de fin (avec un message de repli sans partie
  mémorisée), `/historique`. Application Angular 22 zoneless, composants standalone à entrées `signal`.

## Pièges connus (tirés de `docs/journal.md`)

- La racine pilotée par la physique est un `TransformNode('engin')` propre ; le modèle glTF
  (`engin-modele`) est son enfant. Le nœud physique ne doit jamais hériter de la matrice du nœud
  `__root__` du chargeur glTF (l'échelle Y négative fait interpréter le collider comme un miroir
  par Havok et l'engin traverse le sol).
- Avec des GLB multi-matériaux, le chargeur crée un nœud parent et un maillage par primitive :
  cloner le nœud `cone` complet, pas `meshes[0]`.
- L'inspecteur Babylon exige ses imports d'effets de bord ES6 avant son propre import (voir
  `engine/inspector.ts`).
- `proxy.conf.json` n'est lu qu'au lancement de `ng serve` : relancer le serveur de développement
  après l'avoir modifié, sinon `/api` répond 404.
- En production, `apps/api/src/web-app.ts` sert le front : toute route sans extension hors `/api`
  renvoie `index.html` ; une nouvelle route API doit donc rester sous `/api`.
- Le mark `performance.mark('chantier:scene-prete')` de `game-canvas.component.ts` est lu par les
  tests e2e et les mesures : ne pas le supprimer.
- `mesures:fps` ouvre une fenêtre (vrai GPU). Sous Wayland, Chromium ignore les variables PRIME :
  le mode `--gpu dedie` passe donc Chromium en X11 (`--ozone-platform=x11`).
- Ne pas arrêter un serveur avec `pkill -f "<commande>"` depuis le shell de l'outil : le motif
  correspond aussi au shell lui-même. Arrêter par PID (`ss -ltnp | grep :3000`).
- Pour vérifier le front dans un navigateur, le Chromium headless du cache Playwright
  (`~/.cache/ms-playwright/chromium_headless_shell-*`) se pilote par CDP ; sur cette machine
  (AppArmor), il exige `--no-sandbox`. Les touches se simulent par `KeyboardEvent` sur `window`.
- Des parois statiques invisibles bordent le sol de 60 × 60 m pour que les cônes percutés ne
  tombent pas indéfiniment.

## Journal

`docs/journal.md` est le journal de bord (une entrée par jour ou par étape : temps, aide de l'IA,
problèmes, mesures) qui alimente le bilan final. À la fin d'une étape, ajouter une entrée selon son
modèle.

## Index Graphify

`graphify-out/` (ignoré par Git) contient un graphe du code ; `graphify-out/GRAPH_REPORT.md` en
donne une vue navigable. Mettre à jour avec `graphify update .` ; interroger avec
`graphify query "..." --budget 1500` ou `graphify explain <Symbole>`.
