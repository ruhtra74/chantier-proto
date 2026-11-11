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
| 2     | Assets Blender (`engin.glb`, `cone.glb`)                                   | à faire |
| 3     | Application Angular, scène Babylon.js (primitives)                         | ✅      |
| 4–7   | Déplacement, caméra de poursuite, physique Havok, intégration, interface   | à faire |
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

## Scène actuelle (étape 3)

La scène affiche le sol, la zone d'arrivée et un engin provisoire (boîte + roues) avec trois cônes
aux positions du scénario `chantier-1`. Commandes : glisser pour orbiter, molette pour zoomer,
`I` pour l'inspecteur Babylon.

Pour utiliser les vrais modèles Blender : déposer `engin.glb` et `cone.glb` dans
`apps/web/public/models/`, puis passer `USE_GLB_ASSETS` à `true` dans
`apps/web/src/app/game/engine/load-assets.ts`.

## Structure

```
chantier-proto/
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
