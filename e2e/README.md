# e2e — tests de bout en bout et mesures

Tout se joue sur la **version de production** : l'API compilée sert le front compilé (voir
`apps/api/src/web-app.ts`).

## Tests Playwright (étape 10.7)

```bash
pnpm e2e        # à la racine : pnpm build, puis les tests
```

Playwright démarre lui-même le serveur de production sur le port 3100, avec une base dédiée
`e2e/.data/e2e.db` recréée à chaque lancement. Les 5 tests couvrent : démarrage et HUD, partie
vérifiée par le serveur, historique et rejeu local, partie jouée sans API puis renvoyée (à la
navigation et au rechargement), session falsifiée affichée « non vérifiée ».

Rapport HTML en cas d'échec : `pnpm --filter e2e exec playwright show-report`.

Le navigateur est le Chromium de Playwright 1.65 (révision 1254) ; s'il manque :
`pnpm --filter e2e exec playwright install chromium`.

## Mesures (étapes 10.3 et 10.4)

Démarrer d'abord la version de production, au choix :

```bash
pnpm build && pnpm --filter api db:deploy && pnpm --filter api start   # http://localhost:3000
docker compose up --build                                              # idem, dans un conteneur
```

Puis, dans un autre terminal (`BASE_URL=...` pour viser une autre adresse) :

```bash
pnpm mesures:chargement --etiquette pc-bureau        # poids et temps de premier chargement
pnpm mesures:fps --etiquette pc-bureau               # FPS, GPU par défaut
pnpm mesures:fps --gpu dedie --etiquette pc-bureau   # FPS, GPU dédié (portable hybride)
pnpm mesures:fps --sans-vsync                        # sans plafond de rafraîchissement : marge réelle
```

- `mesures:fps` ouvre une **fenêtre** Chromium (~25 s) pour utiliser le vrai GPU : ne pas y
  toucher. La scène est mesurée 10 s à l'arrêt (`--duree`), puis engin en mouvement jusqu'à
  l'arrivée. Le GPU réellement utilisé est relevé par WebGL et affiché.
- `mesures:chargement` ouvre directement `/jeu` cache vide (3 essais, médiane) puis cache chaud,
  en local et en 4G simulée (9 Mb/s, 1,5 Mb/s, 60 ms). « Scène prête » est le repère
  `performance.mark("chantier:scene-prete")` posé quand la physique et les GLB sont chargés.
- Les résultats sont écrits dans `e2e/resultats/` (ignoré par Git) ; reporter les chiffres dans
  `docs/journal.md` et `docs/bilan.md`.

### Indicateurs FPS

| Colonne                | Sens                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `fpsMoyen`             | images / durée                                                   |
| `fps1PourcentBas`      | FPS correspondant au 99ᵉ centile du temps d'image (« 1 % low »)  |
| `fpsMin`               | image la plus longue                                             |
| `imagesAuDessusDe33ms` | images sous 30 FPS ; le critère C6 vise 30 FPS stables (1 % bas) |

Avec la synchronisation verticale, les FPS sont plafonnés à la fréquence de l'écran (souvent 60).

### GPU dédié sous Linux

Sur un portable hybride, `--gpu dedie` positionne les variables PRIME (`__NV_PRIME_RENDER_OFFLOAD`,
`__GLX_VENDOR_LIBRARY_NAME`, `DRI_PRIME`) **et** lance Chromium en X11 (`--ozone-platform=x11`) :
sous Wayland, Chromium ignore ces variables et reste sur le GPU intégré. Vérifier la ligne `GPU :`
affichée par le script.
