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

## 2026-11-11 — étape 4 (déplacement et caméra de poursuite)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : `VehicleController` sans physique (accélération, freinage, marche arrière,
  rotation), caméra de poursuite lissée derrière l'engin, mesure de la distance entre deux positions
  et émission de `MOVED` par lots de 100 ms, distance affichée dans le HUD, clavier QWERTY / AZERTY /
  flèches avec blocage de la répétition et du défilement.
- Aide de l'IA : implémentation des modules `vehicle.ts` et `camera.ts`, puis test fonctionnel
  automatisé via le protocole DevTools (envoi de vraies touches, relevé des positions, de la caméra
  et du nombre d'événements).
- Problèmes rencontrés / solutions :
  - la distance affichée était inférieure à la position pendant le freinage : le relevé était fait
    avant l'arrêt complet ; le test attend désormais que la vitesse soit nulle, et `flushMoved()`
    émet le reliquat quand l'engin s'arrête ;
  - la marche arrière a été validée par projection du déplacement sur le cap, et non sur l'axe Z,
    car l'engin peut être tourné ;
  - en mode headless, le FPS chute pendant les tests CDP ; la mesure de référence est faite au repos.
- Mesures : 2 s d'accélération puis freinage = 15,223 m parcourus ; distance affichée = somme des
  `MOVED` = 15,223 m, en 21 lots ; virage à gauche jusqu'à −1,954 rad ; marche arrière opposée au
  cap ; caméra à 9 m derrière et 4,5 m de haut ; FPS 36 au repos en Chrome headless avec
  SwiftShader (non représentatif d'un GPU réel) ; aucune erreur console.

## 2026-11-12 — étape 5 (physique Havok)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : `@babylonjs/havok` activé dans la scène (gravité −9,81 m/s²) ; le WASM est
  copié dans `public/havok/` par `apps/web/scripts/copy-havok.mjs` puis servi par Angular (copie
  gitignorée, lancée par `prestart`/`prebuild`) ; corps statique du sol et parois invisibles de
  limite de terrain ; corps dynamique de l'engin (collider boîte, inertie bloquée sur les axes
  horizontaux) ; corps dynamiques des trois cônes ; pilotage par vitesses linéaire et angulaire ;
  collisions engin ↔ cône avec un `CONE_HIT` unique par cône ; détection d'arrivée avec un
  `REACHED_TARGET` unique ; HUD enrichi (cônes touchés, badge « Arrivée »).
- Aide de l'IA : modules `physics.ts` et `transform.ts`, réécriture de `vehicle.ts` en pilotage
  physique, diagnostic et test fonctionnel automatisé via le protocole DevTools (chargement du
  WASM, relevé des corps et de leurs boîtes englobantes, envoi de vraies touches, comptage des
  événements).
- Problèmes rencontrés / solutions :
  - l'engin traversait le sol : après détachement du nœud importé, il héritait de la matrice monde
    `diag(1, −1, 1)` du nœud `__root__` du chargeur glTF (échelle Y négative). Havok interprétait
    le collider comme un miroir et le faisait tomber. Solution : la racine pilotée est désormais un
    `TransformNode('engin')` propre ; le modèle glTF (`engin-modele`) reste son enfant et conserve
    la conversion d'axes du chargeur, sans jamais appliquer d'échelle négative au nœud physique ;
  - le cône percuté était projeté au-delà du sol de 60 m et tombait indéfiniment : ajout de quatre
    parois statiques invisibles (2 m de haut) en limite de terrain. Une première version avait les
    axes longs inversés et créait une barre en travers de l'aire de jeu, corrigée après contrôle
    des boîtes englobantes des corps ;
  - le test comparait la distance affichée à la somme des `MOVED` relevés après branchement du
    journal : il faut retrancher la distance déjà parcourue avant le branchement.
- Mesures : `HavokPhysics.wasm` 2,0 Mo (copié, non versionné) ; ligne droite jusqu'à l'arrivée =
  24,509 m, cohérente avec la somme des `MOVED` ; un seul `CONE_HIT` (`c3`, déplacé d'environ
  10,6 m) et un seul `REACHED_TARGET` ; altitude nulle sur tout le trajet, y compris contre la
  paroi ; marche arrière validée ; caméra à 9 m derrière et 4,5 m de haut ; FPS 30–38 en Chrome
  headless avec SwiftShader ; aucune erreur console.

## 2026-11-12 — étape 6 (intégration domaine ↔ moteur)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : `GameController` (réception des `EngineEvent`, appel du réducteur pur,
  distribution des `UPDATE_HUD` et `END`) ; `EventLog` horodaté (source du rejeu, export
  `SessionSubmission` pour l'API) ; branchement des événements du `VehicleController` au
  contrôleur ; arrêt de l'engin sur `END` ; redémarrage complet (destruction et recréation du
  moteur, de la scène, des corps et de l'état) déclenché par `R` en attendant l'écran de l'étape 7 ;
  HUD enrichi (carburant, résultat et score).
- Aide de l'IA : écriture du contrôleur et du journal, refactorisation du composant en
  `startGame`/`teardown`/`restart`, test fonctionnel CDP couvrant arrivée, score, journal,
  redémarrage et panne sèche.
- Problèmes rencontrés / solutions :
  - lors d'un redémarrage, un chargement Havok/GLB encore en cours pouvait s'appliquer à une scène
    déjà détruite : un compteur de génération invalide les chargements périmés ;
  - `Engine.dispose()` puis création d'un nouveau moteur sur le même canevas a été vérifié
    explicitement (le redémarrage recrée bien la scène et la boucle de rendu) ;
  - les tests doivent comparer la distance du HUD à l'état du domaine, et non à la somme des
    `MOVED` relevés après branchement du journal.
- Mesures : arrivée à 22,15 m (zone d'arrivée atteinte à z ≈ 23,2), carburant 66,77, un cône
  touché, score 1230 (= 1000 − 100 + 5 × 66), 27 entrées de journal, `REACHED_TARGET` à 4 449 ms ;
  redémarrage par `R` : état neuf (carburant 100, distance 0, journal vide) et 3,6 m parcourus
  aussitôt après ; panne sèche simulée par un `MOVED` de 200 m : carburant 0, `END` « panne_seche »,
  score 0, événements suivants ignorés ; aucune erreur console.

## 2026-11-12 — étape 7 (interface)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : HUD extrait dans un composant `app-hud` (FPS, carburant, distance, cônes,
  rappel des touches), alimenté par les `UPDATE_HUD` du domaine au rythme des `MOVED` (10 Hz au
  plus) ; écran de démarrage (objectif, commandes, barème lus depuis le scénario) ; écran de fin
  (raison, score, distance, cônes, carburant, durée, actions Rejouer/Accueil) ; `GameSessionService`
  à la racine pour transmettre l'issue et le `SessionSubmission` au-delà de la destruction du
  composant de jeu ; routes `/`, `/jeu`, `/fin` et redirection `**` ; sur `END`, arrêt de l'engin,
  publication de l'issue puis navigation vers `/fin` ; `Échap` renvoie à l'accueil.
- Aide de l'IA : extraction du HUD et des styles, création des écrans et du service de session,
  branchement du routeur, garde anti-double navigation sur `END`, test fonctionnel CDP couvrant
  accès direct à `/fin`, accueil, partie, arrivée, Rejouer, Échap, panne sèche et retour accueil.
- Problèmes rencontrés / solutions :
  - le HUD était imbriqué dans le composant de jeu : il est désormais un composant à entrées
    `signal`, ce qui isole sa mise en forme et ses styles du cycle de vie du moteur ;
  - l'issue de la partie devait survivre à la destruction du composant de jeu lors de la
    navigation : un service fourni à la racine la conserve pour l'écran de fin ;
  - `END` peut être suivi d'un `flushMoved` : une garde `ended` empêche toute double navigation,
    et les événements tardifs restent ignorés par le contrôleur déjà terminé ;
  - l'écran de fin doit rester utilisable en accès direct (URL saisie ou rechargement) : il affiche
    un message de repli et un bouton **Jouer** quand aucune issue n'est mémorisée ;
  - `body { overflow: hidden }` empêchait le défilement des écrans sur petite hauteur : les écrans
    gèrent eux-mêmes leur défilement vertical.
- Mesures : arrivée en 3,8 s à 23,0 m, 1 cône touché, carburant 65,5, score 1225, 29 entrées de
  journal ; écran de fin conforme (score, quatre statistiques, actions) ; Rejouer repart d'un état
  neuf (carburant 100, distance 0, journal vide) ; `Échap` puis retour accueil validés ; panne
  sèche simulée : score 0 et écran « Panne sèche » ; accès direct à `/fin` sans partie : message de
  repli ; aucune erreur console.

## 2026-11-12 — correctif (inspecteur Babylon)

- Temps passé : à compléter par l'équipe.
- Tâches réalisées : `toggleInspector` charge désormais les effets de bord ES6 de Babylon
  (`@babylonjs/core/Debug/debugLayer` et `@babylonjs/core/Culling/ray`) avant
  `@babylonjs/inspector`, une seule fois et seulement au premier appui sur `I`.
- Aide de l'IA : diagnostic du plantage, import unique mémorisé (`loadInspector`) et test CDP dédié.
- Problèmes rencontrés / solutions :
  - l'inspecteur se chargeait mais plantait au premier rendu (`Ray needs to be imported…`, erreurs
    React `Dropdown` puis `toEuler` dans les lignes de propriété) : les imports d'effets de bord
    exigés par les modules ES6 manquaient ; ils précèdent maintenant l'import de l'inspecteur.
- Mesures : `I` ouvre l'inspecteur (44 racines Fluent UI montées), un second `I` le referme
  (0 racine), aucune erreur console ; régression de l'étape 7 repassée (11 contrôles au vert).
