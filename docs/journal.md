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

## 2026-11-10 — étape 3 (application Angular + scène Babylon.js)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : application Angular 22 zoneless (`apps/web`), scène Babylon.js 9.35 avec sol
  60×60 à grille procédurale, zone d'arrivée issue du scénario, engin provisoire (boîte, cabine,
  4 roues) et trois cônes ; caméra orbitale ; FPS affiché ; inspecteur Babylon sur `I` ; clavier
  QWERTY/AZERTY préparé pour l'étape 4 ; destruction complète du moteur au `ngOnDestroy`.
- Aide de l'IA : scaffolding du CLI, écriture des modules `engine/`, configuration des budgets et
  des scripts `prestart`/`prebuild`, vérification dans un Chrome headless.
- Problèmes rencontrés / solutions :
  - le CLI a créé un `pnpm-workspace.yaml` local à `apps/web` ; supprimé pour rester dans le
    workspace racine ;
  - Angular ne compile pas les sources de `@chantier/domain` ; ajout d'un `prestart`/`prebuild` qui
    lance le build tsup du paquet ;
  - `pnpm --filter web start -- --port 4200` passe un `--` de trop au CLI ; utiliser
    `pnpm --filter web exec ng serve --port 4200 --host 127.0.0.1` ;
  - les dépendances Angular/Babylon ont été épinglées en versions exactes après le scaffolding.
- Mesures : bundle initial de production 1,84 Mo brut / 412 Ko transféré (budget relevé à 2,5 Mo /
  4 Mo à cause de Babylon.js et de l'inspecteur, chargé en chunk lazy) ; FPS 48 en Chrome headless
  avec SwiftShader (WebGL2), aucune erreur console. Assets encore en primitives : les GLB ne sont
  pas encore modélisés.

## 2026-11-11 — étape 2 (assets provisoires) et bascule sur les GLB

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : script Blender headless `blender/build_assets.py` (engin + cône, matériaux
  couleur de base, échelles appliquées, +Y up), export de `blender/engin.blend`,
  `blender/cone.blend`, `apps/web/public/models/engin.glb` et `cone.glb` ; outil de contrôle
  `blender/verify_glb.mjs` ; chargement des GLB dans `load-assets.ts` et bascule de
  `USE_GLB_ASSETS` à `true`.
- Aide de l'IA : écriture du script Blender et du vérificateur, diagnostic du chargement glTF dans
  Babylon, contrôle de la scène via le protocole DevTools (hiérarchie, positions, triangles, FPS).
- Problèmes rencontrés / solutions :
  - avec plusieurs matériaux, le chargeur glTF de Babylon crée un nœud parent et un maillage par
    primitive ; `meshes[0]` pointait sur la racine sans géométrie, donc les clones de cônes étaient
    vides. Corrigé en clonant le nœud `cone` complet (enfants compris) et en stockant les racines
    de cônes dans `GameAssets.cones` ;
  - le nom des roues a été vérifié après conversion : l'avant est bien en +Z dans Babylon ;
  - Blender 5.3 signale `Material.use_nodes` comme déprécié pour Blender 6.0 (sans impact ici).
- Mesures : `engin.glb` 119 Ko, 1 844 triangles, bbox 2,1 × 1,95 × 3,07 m ; `cone.glb` 8 Ko,
  104 triangles, bbox 0,56 × 0,70 × 0,56 m ; FPS 32–39 en Chrome headless avec SwiftShader, aucune
  erreur console, trois cônes actifs aux positions du scénario.
