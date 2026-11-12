# @chantier/domain

Règles métier pures du prototype. Ce paquet est consommé par l'application Angular (étape 3) et
par l'API NestJS (étape 8), ce qui garantit un score identique des deux côtés.

## Contenu

| Fichier                     | Rôle                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `src/schemas.ts`            | Schémas Zod : scénario, événements, commandes, journal, soumission et réponses de l'API |
| `src/types.ts`              | Types TypeScript déduits des schémas                                                    |
| `src/state.ts`              | `createInitialState(scenario)`                                                          |
| `src/score.ts`              | `computeScore(scenario, cônesTouchés, carburantRestant)`                                |
| `src/reducer.ts`            | `reduce(état, événement, scénario)` → `{ state, commands }`                             |
| `src/replay.ts`             | `replay(scenario, journal)` et `replayEvents(scenario, événements)`                     |
| `src/scenarios.ts`          | Scénario `chantier-1` validé au chargement et registre                                  |
| `scenarios/chantier-1.json` | Scénario de référence                                                                   |

## Contrats

```ts
// moteur → domaine
type EngineEvent =
  | { type: "MOVED"; distance: number }
  | { type: "CONE_HIT"; id: string }
  | { type: "REACHED_TARGET" };

// domaine → moteur et interface
type DomainCommand =
  | { type: "UPDATE_HUD"; fuel: number; conesHit: number; distance: number }
  | { type: "END"; reason: "arrivee" | "panne_seche"; score: number };
```

## Commandes

```bash
pnpm --filter @chantier/domain test        # 42 tests Vitest
pnpm --filter @chantier/domain typecheck
pnpm --filter @chantier/domain build       # dist/index.js (ESM), dist/index.cjs (CJS), .d.ts
pnpm --filter @chantier/domain dev         # tsup --watch, utile pendant le développement Angular
```

> L'application Angular ne compile pas les sources de ce paquet : lancez `build` (ou `dev`) avant de
> servir le front. Les exports pointent vers `dist/`.

## Garanties

- Déterministe : aucune lecture d'horloge, aucun aléatoire.
- Pur : aucune dépendance à Babylon.js, Angular, NestJS ou au réseau (règle ESLint
  `no-restricted-imports` dans `eslint.config.mjs`).
- Idempotent sur les cônes : un `CONE_HIT` répété ou inconnu est ignoré.
- Les événements reçus après la fin sont ignorés.
