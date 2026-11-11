# Application web (Angular + Babylon.js)

Front du prototype « un engin sur un chantier ». Il charge le scénario `chantier-1` du paquet
`@chantier/domain`, affiche la scène Babylon.js et, à terme, pilotera l'engin et le HUD.

## Démarrer

Depuis la racine du monorepo :

```bash
pnpm --filter web start
```

Ouvrir http://localhost:4200. Le script `prestart` recompile `@chantier/domain` avant le serveur.

## Scène actuelle (étape 3)

- sol avec grille procédurale ;
- zone d'arrivée (disque + anneau) positionnée par le scénario ;
- engin provisoire (boîte, cabine, 4 roues) et trois cônes primitifs ;
- caméra orbitale (glisser, molette) ;
- FPS affiché, inspecteur Babylon sur `I`.

Pour brancher les modèles Blender : déposer `engin.glb` et `cone.glb` dans `public/models/`, puis
passer `USE_GLB_ASSETS` à `true` dans `src/app/game/engine/load-assets.ts`.

## Structure

```
src/app/
├─ app.component.*          coquille + router-outlet
├─ app.config.ts            configuration Angular
├─ app.routes.ts            route unique vers l'écran de jeu
└─ game/
   ├─ game-canvas.component.*   crée et détruit le moteur Babylon
   └─ engine/
      ├─ create-scene.ts        sol, lumières, zone d'arrivée, caméra
      ├─ load-assets.ts         GLB ou primitives de repli
      ├─ camera.ts              caméra orbitale provisoire
      ├─ input.ts               clavier QWERTY/AZERTY (préparation étape 4)
      └─ inspector.ts           inspecteur chargé à la demande
```

## Build

```bash
pnpm --filter web build
```

Le budget initial est fixé à 2,5 Mo (avertissement) / 4 Mo (erreur) : Babylon.js et l'inspecteur
pèsent lourd, l'inspecteur étant chargé dans un chunk séparé à la demande.
