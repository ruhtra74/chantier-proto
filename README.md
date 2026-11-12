# Chantier prototype

Prototype technique « un engin sur un chantier » décrit dans
`../simu-3D/prototype_chantier_conception.md`.

Objectif : valider la chaîne Blender → GLB → Babylon.js/Havok → Angular, avec un domaine métier
pur partagé entre le navigateur et un serveur NestJS qui rejoue les sessions.

## État d'avancement

| Étape | Contenu                                                                    | État    |
| ----- | -------------------------------------------------------------------------- | ------- |
| 0     | Préparation du dépôt (pnpm, TypeScript, ESLint, Prettier, journal)         | ✅      |
| 1     | Paquet `@chantier/domain` (schémas, score, réducteur, rejeu, tests, build) | ✅      |
| 2     | Assets Blender (`engin.glb`, `cone.glb`, générés par script)               | ✅      |
| 3     | Application Angular, scène Babylon.js (GLB chargés)                        | ✅      |
| 4     | Déplacement clavier, caméra de poursuite, distance par lots `MOVED`        | ✅      |
| 5     | Physique Havok (sol, engin, cônes, collisions, arrivée)                    | ✅      |
| 6     | Intégration domaine (contrôleur, journal, fin de partie, redémarrage)      | ✅      |
| 7     | Interface (HUD, démarrage, fin, navigation)                                | ✅      |
| 8–10  | API NestJS, connexion front/back, mesures et bilan                         | à faire |

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
```

`start` reconstruit automatiquement `@chantier/domain` avant de lancer Angular. Pendant un
développement actif du domaine, lancer `pnpm --filter @chantier/domain dev` dans un second terminal
pour recompiler en continu.

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
├─ packages/domain/         règles métier pures, partagées front + back
└─ apps/
   └─ web/                  application Angular + Babylon.js
```

## Règles d'architecture

- Le paquet `domain` ne dépend que de Zod : ni 3D, ni interface, ni réseau, ni horloge, ni aléatoire.
- Le moteur 3D ne contient aucune règle métier : il émet des `EngineEvent`.
- Le `GameController` (côté web) est le seul endroit où les couches se rencontrent.
- La même fonction de score et le même réducteur servent au navigateur et au serveur (rejeu).
