# Application web (Angular + Babylon.js)

Front du prototype « un engin sur un chantier ». Il charge le scénario `chantier-1` du paquet
`@chantier/domain`, affiche la scène Babylon.js et pilote l'engin jusqu'à l'arrivée. Depuis
l'étape 7, l'application est jouable de bout en bout sans serveur : accueil, partie et écran de fin.

## Démarrer

Depuis la racine du monorepo :

```bash
pnpm --filter web start
```

Ouvrir http://localhost:4200. Le script `prestart` recompile `@chantier/domain` avant le serveur.

## Fonctionnalités (étapes 2–7)

- trois écrans reliés par le routeur : accueil (`/`), jeu (`/jeu`), fin (`/fin`) ; `**` redirige
  vers l'accueil ;
- accueil : objectif, commandes et barème calculés depuis le scénario ;
- fin : raison, score et statistiques (distance, cônes, carburant, durée), avec **Rejouer** et
  **Accueil** ; un accès direct sans partie affiche un message de repli ;
- sol avec grille procédurale et parois invisibles en limite de terrain ;
- zone d'arrivée (disque + anneau) positionnée par le scénario ;
- `engin.glb` chargé sous un conteneur `engin` piloté par la physique (le modèle glTF
  `engin-modele` conserve la conversion d'axes du chargeur) ;
- `cone.glb` chargé une fois puis cloné aux trois positions du scénario ;
- physique Havok : gravité, corps statique du sol, corps dynamiques de l'engin et des cônes ;
- conduite au clavier (ZQSD / WASD / flèches) par vitesses, sans renversement possible ;
- caméra de poursuite lissée derrière l'engin ;
- distance parcourue émise en `MOVED` par lots de 100 ms ;
- collisions engin ↔ cône (`CONE_HIT` unique par cône) et arrivée (`REACHED_TARGET` unique) ;
- `GameController` : événements du moteur → réducteur du domaine → carburant, distance, cônes,
  score et fin de partie (`END`) ;
- journal d'événements horodaté (`EventLog`), prêt pour l'envoi à l'API ;
- HUD dédié (`app-hud`) : FPS, carburant, distance, cônes, alimenté par les `UPDATE_HUD` du
  domaine (10 Hz au plus) ;
- `GameSessionService` : issue de la partie (résultat, statistiques, `SessionSubmission`)
  conservée entre le composant de jeu et l'écran de fin ;
- fin de partie : arrêt de l'engin, publication de l'issue puis navigation vers `/fin` ;
- étape 9 : scénario chargé depuis l'API (copie locale de secours), session envoyée en fin de
  partie et statut de vérification sur l'écran de fin, page `/historique` avec rejeu local, file
  d'envoi persistante (`localStorage`) quand l'API est injoignable ;
- `R` relance une partie, `Échap` revient à l'accueil, `I` ouvre l'inspecteur Babylon (module et
  effets de bord `debugLayer`/`Ray` chargés à la demande).

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
├─ app.config.ts            configuration Angular (HttpClient, renvoi des sessions au démarrage)
├─ app.routes.ts            routes : accueil, jeu, fin, historique
├─ api/
│  ├─ api.service.ts           HttpClient + validation Zod des réponses, erreurs typées
│  ├─ scenario.service.ts      scénario de l'API, copie du domaine en secours
│  ├─ session-sync.service.ts  envoi des sessions, statut, nouvel essai
│  └─ pending-store.ts         sessions non envoyées dans localStorage
├─ screens/
│  ├─ start-screen.component.*  consignes, commandes et barème
│  ├─ end-screen.component.*    raison, score, statistiques et vérification serveur
│  └─ history-screen.component.*  parties enregistrées, rejeu local sans 3D
└─ game/
   ├─ game-canvas.component.*   crée, redémarre et détruit le moteur Babylon
   ├─ hud.component.*           HUD (FPS, carburant, distance, cônes)
   ├─ session.service.ts        issue de la partie partagée avec l'écran de fin
   ├─ game-controller.ts        domaine ↔ moteur : HUD, fin de partie
   ├─ event-log.ts              journal horodaté des événements
   └─ engine/
      ├─ create-scene.ts        sol, lumières, zone d'arrivée
      ├─ load-assets.ts         GLB (ou primitives de repli), conteneur de l'engin
      ├─ physics.ts             Havok : sol, parois, corps engin et cônes
      ├─ transform.ts           cap (lacet) d'un nœud piloté par la physique
      ├─ camera.ts              caméra de poursuite
      ├─ vehicle.ts             pilotage par vitesses, MOVED, CONE_HIT, arrivée
      ├─ input.ts               clavier QWERTY/AZERTY, R, Échap, I
      └─ inspector.ts           inspecteur et effets de bord Babylon chargés à la demande
```

## Scripts

- `scripts/copy-havok.mjs` : copie `HavokPhysics.wasm` de `node_modules` vers `public/havok/`.

## Build

```bash
pnpm --filter web build
```

Le budget initial est fixé à 2,5 Mo (avertissement) / 4 Mo (erreur) : Babylon.js et l'inspecteur
pèsent lourd, l'inspecteur étant chargé dans un chunk séparé à la demande.
