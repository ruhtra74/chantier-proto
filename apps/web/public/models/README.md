# Modèles 3D

Déposer ici les fichiers exportés depuis Blender :

- `engin.glb` — l'engin, origine au centre de la base, avant vers −Y dans Blender ;
- `cone.glb` — le cône, origine au centre de la base.

Ils seront servis à l'URL `/models/engin.glb` et `/models/cone.glb`.

Tant que ces fichiers sont absents, la scène utilise des primitives. Pour basculer sur les GLB,
passer `USE_GLB_ASSETS` à `true` dans `src/app/game/engine/load-assets.ts`.

Conventions d'export détaillées : `blender/README.md` (étape 2).
