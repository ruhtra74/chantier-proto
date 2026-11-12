# Application web (Angular + Babylon.js)

Front du prototype « un engin sur un chantier ». Il charge le scénario `chantier-1` du paquet
`@chantier/domain`, affiche la scène Babylon.js et, à terme, pilotera l'engin et le HUD.

## Démarrer

Depuis la racine du monorepo :

```bash
pnpm --filter web start
```

Ouvrir http://localhost:4200. Le script `prestart` recompile `@chantier/domain` avant le serveur.

## Scène actuelle (étapes 2–5)

- sol avec grille procédurale et parois invisibles en limite de terrain ;
- zone d'arrivée (disque + anneau) positionnée par le scénario ;
- `engin.glb` chargé sous un conteneur `engin` piloté par la physique (le modèle glTF
  `engin-modele` conserve la conversion d'axes du chargeur) ;
- `cone.glb` chargé une fois puis cloné aux trois positions du scénario ;
- physique Havok : gravité, corps statique du sol, corps dynamiques de l'engin et des cônes ;
- conduite au clavier (ZQSD / WASD / flèches) par vitesses, sans renversement possible ;
- caméra de poursuite lissée derrière l'engin ;
- distance parcourue affichée, émise en `MOVED` par lots de 100 ms ;
- collisions engin ↔ cône (`CONE_HIT` unique par cône) et arrivée (`REACHED_TARGET` unique) ;
- `GameController` : événements du moteur → réducteur du domaine → carburant, distance, cônes,
  score et fin de partie (`END`) ;
- journal d'événements horodaté (`EventLog`), prêt pour l'envoi à l'API ;
- redémarrage complet par `R` (moteur, scène, corps et état recréés) ;
- FPS affiché, inspecteur Babylon sur `I`.

Les assets proviennent de `blender/build_assets.py` (voir `blender/README.md`). Ils sont servis à
`/models/engin.glb` et `/models/cone.glb`. Pour revenir aux primitives de repli, passer
`USE_GLB_ASSETS` à `false` dans `src/app/game/engine/load-assets.ts`.

Le WASM de Havok est copié dans `public/havok/` par `scripts/copy-havok.mjs`, lancé par
`prestart` et `prebuild` ; la copie est gitignorée et suit la version épinglée de
`@babylonjs/havok`.

## Structure

```
src/app/
├─ app.component.*          coquille + router-outlet
├─ app.config.ts            configuration Angular
├─ app.routes.ts            route unique vers l'écran de jeu
└─ game/
   ├─ game-canvas.component.*   crée, redémarre et détruit le moteur Babylon
   ├─ game-controller.ts        domaine ↔ moteur : HUD, fin de partie
   ├─ event-log.ts              journal horodaté des événements
   └─ engine/
      ├─ create-scene.ts        sol, lumières, zone d'arrivée
      ├─ load-assets.ts         GLB (ou primitives de repli), conteneur de l'engin
      ├─ physics.ts             Havok : sol, parois, corps engin et cônes
      ├─ transform.ts           cap (lacet) d'un nœud piloté par la physique
      ├─ camera.ts              caméra de poursuite
      ├─ vehicle.ts             pilotage par vitesses, MOVED, CONE_HIT, arrivée
      ├─ input.ts               clavier QWERTY/AZERTY
      └─ inspector.ts           inspecteur chargé à la demande
```

## Scripts

- `scripts/copy-havok.mjs` : copie `HavokPhysics.wasm` de `node_modules` vers `public/havok/`.

## Build

```bash
pnpm --filter web build
```

Le budget initial est fixé à 2,5 Mo (avertissement) / 4 Mo (erreur) : Babylon.js et l'inspecteur
pèsent lourd, l'inspecteur étant chargé dans un chunk séparé à la demande.
