# Journal de bord du prototype

Une entrée par jour travaillé : temps passé, ce que l'IA a aidé à faire, problèmes rencontrés,
décisions prises. Ce journal alimente le bilan (étape 10.8) et le rapport de phase 0 (10.9).

## Modèle d'entrée

```md
### AAAA-MM-JJ — étape N (taille)

- Temps passé :
- Tâches réalisées :
- Aide de l'IA (ce qui a été généré, ce qui a été corrigé à la main) :
- Problèmes rencontrés / solutions :
- Mesures (FPS, poids des GLB, temps de chargement) :
```

## 2026-11-10 — étape 0 / étape 1

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : socle pnpm (workspace, TypeScript strict, ESLint + Prettier, journal), paquet
  `@chantier/domain` (schémas Zod, état, score, réducteur, rejeu, scénario `chantier-1.json`,
  42 tests Vitest, build tsup ESM + CJS + déclarations).
- Aide de l'IA : génération du socle et du paquet `domain` à partir du document de conception, puis
  vérification par typecheck, lint, tests et build.
- Problèmes rencontrés / solutions :
  - pnpm 12 a refusé l'installation tant que le script postinstall d'esbuild n'était pas approuvé ;
    résolu avec `pnpm approve-builds --all`, puis consigné dans `pnpm-workspace.yaml` (`allowBuilds`).
  - `save-exact` n'est plus lu depuis `.npmrc` par pnpm 12 ; les versions sont figées dans les
    `package.json` et `savePrefix: ""` est défini dans `pnpm-workspace.yaml`.
- Mesures : `pnpm test` → 42 tests réussis en moins d'une seconde ; build ESM 6,5 Ko, CJS 8,6 Ko
  (hors sourcemaps).
