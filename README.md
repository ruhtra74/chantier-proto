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
| 3–4   | Application Angular, scène Babylon.js, déplacement                         | à faire |
| 5–7   | Physique Havok, intégration, interface                                     | à faire |
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
```

## Structure

```
chantier-proto/
├─ docs/journal.md          journal de bord (temps, IA, problèmes, mesures)
├─ packages/domain/         règles métier pures, partagées front + back
└─ apps/                    (à venir) web Angular, api NestJS
```

## Règles d'architecture

- Le paquet `domain` ne dépend que de Zod : ni 3D, ni interface, ni réseau, ni horloge, ni aléatoire.
- Le moteur 3D ne contient aucune règle métier : il émet des `EngineEvent`.
- Le `GameController` (côté web) est le seul endroit où les couches se rencontrent.
- La même fonction de score et le même réducteur servent au navigateur et au serveur (rejeu).
