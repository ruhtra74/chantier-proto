# Chantier prototype

Prototype technique « un engin sur un chantier » décrit dans
`../simu-3D/prototype_chantier_conception.md`.

Objectif : valider la chaîne Blender → GLB → Babylon.js/Havok → Angular, avec un domaine métier
pur partagé entre le navigateur et un serveur NestJS qui rejoue les sessions.

## État d'avancement

| Étape | Contenu                                                                      | État   |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 0     | Préparation du dépôt (pnpm, TypeScript, ESLint, Prettier, journal)           | ✅     |
| 1     | Paquet `@chantier/domain` (schémas, score, réducteur, rejeu, tests, build)   | ✅     |
| 2     | Assets Blender (`engin.glb`, `cone.glb`, générés par script)                 | ✅     |
| 3     | Application Angular, scène Babylon.js (GLB chargés)                          | ✅     |
| 4     | Déplacement clavier, caméra de poursuite, distance par lots `MOVED`          | ✅     |
| 5     | Physique Havok (sol, engin, cônes, collisions, arrivée)                      | ✅     |
| 6     | Intégration domaine (contrôleur, journal, fin de partie, redémarrage)        | ✅     |
| 7     | Interface (HUD, démarrage, fin, navigation)                                  | ✅     |
| 8     | API NestJS (scénarios, sessions, vérification par rejeu, Prisma/SQLite)      | ✅     |
| 9     | Connexion front/back (proxy, envoi, vérification, historique, hors ligne)    | ✅     |
| 10    | Découplage, production, Docker, Playwright, mesures, bilan (`docs/bilan.md`) | ✅ (1) |

(1) Restent à l'équipe : mesure FPS sur une seconde machine, durées réelles dans le journal et le
bilan, report des conclusions dans le rapport de phase 0.

## Prérequis

- Node.js LTS (testé avec Node 24)
- pnpm 12 (`corepack enable`)
- Blender (version stable) pour l'étape 2

## Commandes

```bash
pnpm install          # installe tout le workspace
pnpm test             # tests de tous les paquets (Vitest)
pnpm typecheck        # vérification TypeScript
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm build            # build de tous les paquets

pnpm --filter web start   # serveur de développement Angular (http://localhost:4200)
pnpm --filter api dev     # API NestJS en mode watch (http://localhost:3000/api)

pnpm decouplage           # partie jouée sur le domaine seul, sans 3D (critère C4)
pnpm e2e                  # build + tests Playwright sur la version de production
pnpm mesures:fps          # FPS sur le vrai GPU (serveur de production lancé, voir e2e/README.md)
pnpm mesures:chargement   # poids et temps de premier chargement
```

## Version de production

```bash
pnpm build && pnpm --filter api db:deploy && pnpm --filter api start   # http://localhost:3000
docker compose up --build                                              # idem, base dans un volume
```

Si la construction de l'image bloque sur des délais dépassés vers `registry.npmjs.org` (réseau du
conteneur), la lancer sur le réseau de l'hôte puis démarrer normalement :
`docker build --network host -t chantier-proto-chantier . && docker compose up`.

L'API compilée sert aussi le front compilé (`apps/web/dist/web/browser`, ou `WEB_DIST_DIR`), avec
compression gzip et cache long des fichiers hashés : un seul processus, un seul port, pas de proxy.

`start` reconstruit automatiquement `@chantier/domain` avant de lancer Angular. Pendant un
développement actif du domaine, lancer `pnpm --filter @chantier/domain dev` dans un second terminal
pour recompiler en continu.

## Index du code (Graphify)

Le prototype est indexé avec [Graphify](https://github.com/Graphify-Labs/graphify) pour réduire le
contexte nécessaire aux relectures et aux prochaines sessions :

```bash
graphify update .                     # reconstruit graphify-out/ (sans clé API)
graphify query "..." --budget 1500    # interroge le graphe
graphify explain GameController       # un nœud et ses voisins
graphify export html                  # graphify-out/graph.html
```

Le rapport navigable est `graphify-out/GRAPH_REPORT.md` ; il couvre le code, les documents et le
journal. Les artefacts sont générés et ignorés par Git : relancer `graphify update .` après des
changements de code.

## Connexion à l'API (étape 9)

Lancer l'API (`pnpm --filter api dev`) puis le front (`pnpm --filter web start`) : le serveur de
développement Angular relaie `/api` vers http://localhost:3000 (`apps/web/proxy.conf.json`).

- le scénario est demandé à l'API, avec la copie du paquet `domain` comme secours ;
- en fin de partie, la session est envoyée à l'API, qui la rejoue ; l'écran de fin affiche
  « Score vérifié par le serveur » ou l'écart constaté ;
- la page **Historique** (`/historique`) liste les parties enregistrées et permet de rejouer un
  journal dans le navigateur, sans 3D, pour comparer au score du serveur ;
- sans API, la partie se termine normalement : la session est conservée dans `localStorage` et
  renvoyée au prochain chargement, à chaque navigation et au retour du réseau.

## Version jouable (étapes 2–7)

Trois écrans reliés par le routeur Angular : accueil (`/`), jeu (`/jeu`) et fin (`/fin`).
L'accueil rappelle l'objectif, les commandes et le barème ; l'écran de fin affiche la raison de la
fin de partie, le score et les statistiques (distance, cônes, carburant, durée), avec les actions
**Rejouer** et **Accueil**. Un accès direct à `/fin` sans partie affiche un message de repli.

La scène charge `engin.glb` (parent `engin`, corps, cabine, quatre roues) et instancie `cone.glb`
trois fois aux positions du scénario `chantier-1`, sur un sol à grille et une zone d'arrivée.

L'engin se conduit avec **ZQSD**, **WASD** ou les **flèches** (avant, arrière, gauche, droite).
La physique Havok le maintient au sol et gère les collisions : il ne peut pas se renverser, chaque
cône percuté émet un unique `CONE_HIT` et l'arrivée un unique `REACHED_TARGET`. La caméra de
poursuite suit l'engin en douceur. Le HUD (`app-hud`) affiche FPS, carburant, distance et cônes,
alimenté par le domaine au rythme des `MOVED` (10 Hz au plus). À la fin de partie, `END` arrête
l'engin, l'issue est publiée dans `GameSessionService` et le routeur ouvre `/fin`. `R` relance une
partie, `Échap` revient à l'accueil et `I` ouvre l'inspecteur Babylon.

Le WASM de Havok est copié depuis `node_modules` vers `public/havok/` par
`apps/web/scripts/copy-havok.mjs` (lancé par `prestart`/`prebuild`, copie non versionnée).

Les assets provisoires sont générés par `blender/build_assets.py` (voir `blender/README.md`). Pour
les remplacer par de vrais modèles, exporter les GLB par-dessus en respectant les mêmes conventions :
aucun changement de code n'est nécessaire.

## Structure

```
chantier-proto/
├─ blender/                 script de génération et conventions des assets
├─ docs/journal.md          journal de bord (temps, IA, problèmes, mesures)
├─ docs/bilan.md            bilan du prototype (critères, mesures, problèmes, apport de l'IA)
├─ e2e/                     tests Playwright et scripts de mesure (FPS, chargement)
├─ Dockerfile, docker-compose.yml   image de production (API + front)
├─ packages/domain/         règles métier pures, partagées front + back
└─ apps/
   ├─ web/                  application Angular + Babylon.js
   └─ api/                  API NestJS + Prisma (SQLite), vérification des sessions par rejeu
```

## Règles d'architecture

- Le paquet `domain` ne dépend que de Zod : ni 3D, ni interface, ni réseau, ni horloge, ni aléatoire.
- Le moteur 3D ne contient aucune règle métier : il émet des `EngineEvent`.
- Le `GameController` (côté web) est le seul endroit où les couches se rencontrent.
- La même fonction de score et le même réducteur servent au navigateur et au serveur (rejeu).
