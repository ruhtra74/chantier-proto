# Modèles 3D

Contient les assets chargés par la scène :

- `engin.glb` — engin provisoire : parent vide `engin` avec `corps`, `cabine` et quatre roues ;
  origine au centre de la base, au niveau du sol, avant vers +Z dans le repère Babylon ;
- `cone.glb` — cône provisoire, origine au centre de la base.

Les fichiers sont générés par le script Blender du dépôt :

```bash
blender --background --factory-startup --python blender/build_assets.py
node blender/verify_glb.mjs apps/web/public/models/engin.glb apps/web/public/models/cone.glb
```

Ils sont servis à `/models/engin.glb` et `/models/cone.glb`. Les conventions d'export et la
procédure de remplacement par de vrais modèles sont décrites dans `blender/README.md`.

Pour revenir aux primitives de repli, passer `USE_GLB_ASSETS` à `false` dans
`src/app/game/engine/load-assets.ts`.
