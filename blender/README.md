# Assets Blender du prototype

Génère les deux assets provisoires du prototype à partir de primitives, selon les conventions de la
section 8 du document de conception :

- unités métriques (1 unité = 1 m), échelles appliquées ;
- engin : parent vide `engin` avec les enfants `corps`, `cabine`, `roue_AVG`, `roue_AVD`,
  `roue_ARG`, `roue_ARD` ; origine au centre de la base, au niveau du sol ; avant vers **−Y** dans
  Blender, soit **+Z** dans le repère Babylon après conversion ;
- cône : un seul objet `cone`, origine au centre de la base ;
- matériaux à couleur de base uniquement, sans texture ;
- export glTF binaire (`.glb`), +Y up, modificateurs appliqués.

## Régénérer les fichiers

```bash
blender --background --factory-startup --python blender/build_assets.py
```

Le script écrit :

| Fichier                            | Rôle                                             |
| ---------------------------------- | ------------------------------------------------ |
| `blender/engin.blend`              | scène source de l'engin, modifiable dans Blender |
| `blender/cone.blend`               | scène source du cône                             |
| `apps/web/public/models/engin.glb` | asset servi à `/models/engin.glb`                |
| `apps/web/public/models/cone.glb`  | asset servi à `/models/cone.glb`                 |

Le script est idempotent : il repart d'une scène vide à chaque exécution.

## Vérifier un export

```bash
node blender/verify_glb.mjs apps/web/public/models/engin.glb apps/web/public/models/cone.glb
```

Le script affiche la hiérarchie, les matériaux, les boîtes englobantes et le nombre de triangles.

## Remplacer par les vrais modèles

Modéliser dans Blender en respectant les mêmes conventions, exporter par-dessus les deux `.glb`, puis
relancer la vérification et l'application. Aucun changement de code n'est nécessaire.
