# Bilan du prototype « Un engin sur un chantier » (étape 10.8)

État au 2026-11-12. Les durées réelles et la mesure sur une seconde machine sont à compléter par
l'équipe (sections marquées **À compléter**).

## 1. Critères de réussite (section 11 du document de conception)

| N°  | Critère                                                         | Résultat                                                                                                                                   |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Objet Blender affiché à la bonne échelle                        | ✅ `engin.glb` (2,1 × 1,95 × 3,07 m) et `cone.glb` générés par script, conventions d'axes vérifiées                                        |
| C2  | Partie jouable de bout en bout                                  | ✅ accueil, conduite, collisions, arrivée ou panne sèche, score, fin, historique ; couvert par les tests Playwright                        |
| C3  | `domain` sans dépendance 3D / interface / réseau, tests seuls   | ✅ Zod seule dépendance, règle ESLint, 46 tests Vitest                                                                                     |
| C4  | Script de découplage jouant une partie sans 3D                  | ✅ `pnpm decouplage` : partie complète et panne sèche dans Node seul, Babylon/Angular/NestJS inaccessibles depuis le domaine               |
| C5  | Le serveur rejoue et confirme le score ; falsification détectée | ✅ rejeu avec le même paquet ; score falsifié enregistré avec `verified = false` (tests A3 et Playwright)                                  |
| C6  | ≥ 30 FPS stables sur un PC à GPU intégré                        | ✅ sur Intel UHD (Alder Lake) : 59 FPS de moyenne (plafond 60 Hz), 1 % bas ≥ 30 ; ~1 100 FPS sans vsync. **À compléter** : seconde machine |
| C7  | Journal avec temps réels et apport de l'IA par étape            | ⚠️ apport de l'IA consigné à chaque étape ; **temps réels à compléter**                                                                    |

## 2. Ce qui fonctionne

- **Chaîne Blender → GLB → navigateur** : les assets sont produits par un script Blender headless
  idempotent ; remplacer les GLB par de vrais modèles respectant les conventions ne demande aucun
  changement de code. Poids : 118 Ko (engin, 1 844 triangles) et 8 Ko (cône), 12 Ko et 2 Ko
  compressés.
- **Découplage en couches** : le domaine est une fonction pure `(état, événement) → (état,
commandes)` ; le moteur 3D n'émet que des événements ; le `GameController` est le seul point de
  rencontre. Le même code calcule le score dans le navigateur, sur le serveur et dans le script de
  découplage.
- **Vérification serveur** : chaque session est rejouée par l'API ; une falsification est
  enregistrée mais signalée.
- **Mode dégradé** : sans API, la partie reste jouable (scénario local) et la session est conservée
  puis renvoyée automatiquement.
- **Production** : un seul processus (l'API sert le front), compressé et mis en cache ; image Docker
  avec base persistante.

## 3. Mesures

### Fluidité (10.3) — portable hybride Intel Core i5-12450H, 30 Go, Ubuntu, écran 1920 × 1080 à 60 Hz

Canevas 1280 × 800, Chromium 158 avec fenêtre (vrai GPU), scène à l'arrêt 10 s puis conduite.

| GPU                       | Vsync | FPS moyen (arrêt / conduite) | 1 % bas (arrêt / conduite) | Images > 33 ms |
| ------------------------- | ----- | ---------------------------- | -------------------------- | -------------- |
| Intel UHD intégrée (Mesa) | oui   | 59,1 / 55,7                  | 30 / 40,8                  | 3 sur ~780     |
| NVIDIA RTX 3050 Laptop    | oui   | 59,3 / 59,4                  | 59,5 / 30                  | 4 sur ~790     |
| Intel UHD intégrée        | non   | 1 112 / 1 034                | 400 / 370                  | 1              |
| NVIDIA RTX 3050 Laptop    | non   | 2 159 / 1 755                | 385 / 345                  | 1              |

- Le GPU intégré tient le plafond de l'écran ; les rares images lentes sont isolées (3 ou 4 sur
  près de 800) et se retrouvent aussi sur le GPU dédié : elles ne viennent pas du GPU.
- Un premier passage sur la RTX 3050 a montré une image de 1 s (sortie de veille du GPU dédié en
  mode PRIME « on-demand ») ; non reproduit au passage suivant.
- **Limite** : la scène compte environ 2 000 triangles. Ces chiffres valident la chaîne technique,
  pas la tenue d'une vraie scène minière ; la marge (~1 100 FPS sans vsync sur GPU intégré) laisse
  de la place mais devra être remesurée avec des modèles réels.
- **À compléter** : mesure sur une seconde machine (`pnpm mesures:fps`, voir `e2e/README.md`).

### Chargement (10.4) — ouverture directe de `/jeu`, médiane de 3 essais cache vide

| Réseau                             | Avant compression | Après compression + cache |
| ---------------------------------- | ----------------- | ------------------------- |
| Octets transférés                  | 5,8 Mo            | 1,7 Mo                    |
| Local : scène prête (vide / chaud) | 1,9 s / 1,4 s     | 1,5 s / 1,0 s             |
| 4G simulée : scène prête           | 7,6 s / 4,3 s     | 4,4 s / 1,5 s             |

Répartition après compression : JavaScript 1 046 Ko, WASM Havok 627 Ko, GLB 14 Ko. Le WASM de la
physique pèse 45 fois plus que les modèles ; avec de vrais modèles, les GLB deviendront le poste
principal (prévoir compression Draco/Meshopt et textures KTX2).

## 4. Ce qui a posé problème

| Sujet                  | Problème                                                                                                                                                         | Solution                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| glTF → physique        | le nœud racine du chargeur glTF a une échelle Y négative : Havok inversait le collider                                                                           | racine physique `TransformNode` propre, modèle glTF en enfant                |
| GLB multi-matériaux    | `meshes[0]` est un nœud sans géométrie : clones de cônes vides                                                                                                   | cloner le nœud complet                                                       |
| Havok                  | le WASM doit être servi en statique                                                                                                                              | copie depuis `node_modules` par script (`prestart`/`prebuild`)               |
| Cônes projetés         | un cône percuté tombait hors du terrain indéfiniment                                                                                                             | parois statiques invisibles                                                  |
| Redémarrage            | un chargement asynchrone périmé s'appliquait à une scène détruite                                                                                                | compteur de génération                                                       |
| Inspecteur Babylon     | plantage faute d'imports d'effets de bord (modules ES6)                                                                                                          | imports explicites avant l'inspecteur                                        |
| Angular ↔ domaine      | Angular ne compile pas les sources du paquet partagé                                                                                                             | build tsup du domaine avant `start`/`build`                                  |
| Écosystème très récent | NestJS 12 en ESM seul (Jest → Vitest) ; Prisma 7 (adaptateur obligatoire) ; tag `latest` de Prisma sur une RC ; version NestJS bloquée par l'âge minimal de pnpm | Vitest + Supertest, versions stables figées, aucune exception de sécurité    |
| Production             | fichiers servis sans compression ni cache                                                                                                                        | `compression` + cache immuable des fichiers hashés                           |
| Mesures GPU sous Linux | sous Wayland, Chromium ignore PRIME et reste sur le GPU intégré ; bac à sable bloqué par AppArmor en headless                                                    | `--ozone-platform=x11` pour le GPU dédié ; `--no-sandbox` pour les tests CDP |

## 5. Durées réelles

**À compléter par l'équipe** à partir des lignes « Temps passé » du journal, et à comparer aux
hypothèses du document de conception :

| Étape | Taille | Hypothèse (jours) | Réel (jours) |
| ----- | ------ | ----------------- | ------------ |
| 0     | M      | 1                 |              |
| 1     | L      | 2                 |              |
| 2     | L      | 2                 |              |
| 3     | L      | 2                 |              |
| 4     | M      | 1,5               |              |
| 5     | L      | 3                 |              |
| 6     | M      | 1,5               |              |
| 7     | M      | 1                 |              |
| 8     | L      | 3                 |              |
| 9     | M      | 1,5               |              |
| 10    | L      | 2                 |              |
| Total |        | 20,5              |              |

Ordre de grandeur constaté : d'après l'historique Git, les commits des étapes 0 à 10 s'étalent du
2026-11-10 au 2026-11-12, avec un assistant IA, contre 20,5 jours prévus (temps de travail effectif
à confirmer).

## 6. Apport de l'IA

- **Ce qu'elle a produit** : la quasi-totalité du code (domaine, scène, physique, interface, API,
  connexion, tests), le script Blender, les scripts de vérification et de mesure, la documentation
  et ce journal.
- **Ce qui a fait la différence** : les tests fonctionnels automatisés dans un vrai navigateur
  (protocole DevTools puis Playwright) à chaque étape ; c'est ainsi qu'ont été trouvés les défauts
  qu'aucun test unitaire ne voyait (échelle négative du glTF, clones vides, distance pendant le
  freinage, inspecteur, chargements périmés).
- **Points de vigilance** : l'écosystème évolue plus vite que les connaissances du modèle (NestJS 12
  en ESM, Prisma 7) — chaque choix de version a été vérifié sur le registre npm ; plusieurs
  premières versions étaient fausses et n'ont été corrigées que grâce aux tests et aux mesures. Le
  code généré doit rester relu par l'équipe (risque « code non maîtrisé » de la section 12).

## 7. Suites proposées (section 14)

1. Mesurer sur une seconde machine et compléter les durées (C6, C7).
2. Remplacer les assets provisoires par un vrai modèle d'engin et remesurer poids, chargement et FPS.
3. Comparer avec Three.js + Rapier sur la même scène, avec les mêmes scripts de mesure.
4. Ajouter un identifiant d'idempotence aux sessions (doublon possible si la réponse 201 se perd).
5. Produire les traces xAPI à partir du journal d'événements.
