# Application web (Angular + Babylon.js)

Front du prototype « un engin sur un chantier ». Il charge le scénario `chantier-1` du paquet
`@chantier/domain`, affiche la scène Babylon.js et, à terme, pilotera l'engin et le HUD.

## Démarrer

Depuis la racine du monorepo :

```bash
pnpm --filter web start
```

Ouvrir http://localhost:4200. Le script `prestart` recompile `@chantier/domain` avant le serveur.

## Scène actuelle (étapes 2–4)

- sol avec grille procédurale ;
- zone d'arrivée (disque + anneau) positionnée par le scénario ;
- `engin.glb` chargé comme racine mobile (`engin` → `corps`, `cabine`, quatre roues) ;
- `cone.glb` chargé une fois puis cloné aux trois positions du scénario ;
- conduite au clavier (ZQSD / WASD / flèches) avec accélération et marche arrière ;
- caméra de poursuite lissée derrière l'engin ;
- distance parcourue affichée, émise en `MOVED` par lots de 100 ms ;
- FPS affiché, inspecteur Babylon sur `I`.

Les assets proviennent de `blender/build_assets.py` (voir `blender/README.md`). Ils sont servis à
`/models/engin.glb` et `/models/cone.glb`. Pour revenir aux primitives de repli, passer
`USE_GLB_ASSETS` à `false` dans `src/app/game/engine/load-assets.ts`.

## Structure

```
src/app/
├─ app.component.*          coquille + router-outlet
├─ app.config.ts            configuration Angular
├─ app.routes.ts            route unique vers l'écran de jeu
└─ game/
   ├─ game-canvas.component.*   crée et détruit le moteur Babylon
   └─ engine/
      ├─ create-scene.ts        sol, lumières, zone d'arrivée
      ├─ load-assets.ts         GLB (ou primitives de repli)
      ├─ camera.ts              caméra de poursuite
      ├─ vehicle.ts             conduite sans physique + lots MOVED
      ├─ input.ts               clavier QWERTY/AZERTY
      └─ inspector.ts           inspecteur chargé à la demande
```

## Build

```bash
pnpm --filter web build
```

Le budget initial est fixé à 2,5 Mo (avertissement) / 4 Mo (erreur) : Babylon.js et l'inspecteur
pèsent lourd, l'inspecteur étant chargé dans un chunk séparé à la demande.
