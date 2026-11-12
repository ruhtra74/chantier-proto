// Mesure de fluidité (étape 10.3, critère C6) : FPS de la scène dans un Chromium **avec fenêtre**,
// donc sur le vrai GPU, scène à l'arrêt puis engin en mouvement.
//
//   pnpm mesures:fps                       GPU par défaut (intégré sur un portable hybride)
//   pnpm mesures:fps --gpu dedie        GPU dédié NVIDIA/AMD (PRIME offload)
//   pnpm mesures:fps --sans-vsync       sans plafond de rafraîchissement (marge réelle)
//   options : --duree 10 (s, phase à l'arrêt) --etiquette pc-bureau
//
// Prérequis : version de production démarrée (voir commun.mjs) ; une fenêtre s'ouvre ~25 s.
import { chromium } from "@playwright/test";
import {
  BASE_URL,
  GPU_DEDIE_ARGS,
  GPU_DEDIE_ENV,
  arrondi,
  attendreScenePrete,
  enregistrer,
  gpuDeLaPage,
  machine,
  options,
  verifierServeur,
} from "./commun.mjs";

const opts = options({
  duree: { type: "string", default: "10" },
  "sans-vsync": { type: "boolean", default: false },
});
const dureeMs = Number(opts.duree) * 1000;
await verifierServeur();

const args = ["--ignore-gpu-blocklist", "--window-size=1280,860"];
if (opts["sans-vsync"]) args.push("--disable-gpu-vsync", "--disable-frame-rate-limit");
if (opts.gpu === "dedie") args.push(...GPU_DEDIE_ARGS);

const browser = await chromium.launch({
  headless: false,
  args,
  env: { ...process.env, ...(opts.gpu === "dedie" ? GPU_DEDIE_ENV : {}) },
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

/** Compteur d'images par requestAnimationFrame (même cadence que la boucle de rendu Babylon). */
await page.addInitScript(() => {
  const state = { deltas: [], last: null };
  window.__mesureFps = {
    reset() {
      state.deltas = [];
      state.last = null;
    },
    deltas: () => state.deltas,
  };
  const tick = (time) => {
    if (state.last !== null) state.deltas.push(time - state.last);
    state.last = time;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

function statistiques(deltas) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const total = deltas.reduce((sum, d) => sum + d, 0);
  const quantile = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    images: deltas.length,
    fpsMoyen: arrondi((deltas.length * 1000) / total),
    fpsMedian: arrondi(1000 / quantile(0.5)),
    fps1PourcentBas: arrondi(1000 / quantile(0.99)),
    fpsMin: arrondi(1000 / sorted[sorted.length - 1]),
    imagesAuDessusDe33ms: deltas.filter((d) => d > 1000 / 30).length,
  };
}

async function mesurer(dureeMax, stop) {
  await page.evaluate(() => window.__mesureFps.reset());
  const start = Date.now();
  while (Date.now() - start < dureeMax && !(await stop())) await page.waitForTimeout(250);
  return statistiques(await page.evaluate(() => window.__mesureFps.deltas()));
}

await page.goto(`${BASE_URL}/jeu`);
await attendreScenePrete(page);
const gpu = await gpuDeLaPage(page);
const ecran = await page.evaluate(() => ({
  canvas: `${document.querySelector("canvas")?.width}×${document.querySelector("canvas")?.height}`,
  devicePixelRatio: window.devicePixelRatio,
}));
await page.waitForTimeout(2000); // préchauffage (compilation des shaders, premiers rendus)

const arret = await mesurer(dureeMs, async () => false);
await page.keyboard.down("ArrowUp");
const conduite = await mesurer(15_000, async () => page.url().endsWith("/fin"));
await page.keyboard.up("ArrowUp");
await browser.close();

const resultat = {
  date: new Date().toISOString(),
  machine: machine(),
  gpu,
  modeGpu: opts.gpu,
  vsync: !opts["sans-vsync"],
  ecran,
  sceneAlArret: arret,
  conduite,
  seuil30Fps: arret.fps1PourcentBas >= 30 && conduite.fps1PourcentBas >= 30,
};
const file = enregistrer("fps", opts.etiquette || opts.gpu, resultat);

console.log(`GPU : ${gpu}  (mode ${opts.gpu}, vsync ${resultat.vsync ? "actif" : "désactivé"})`);
console.log(`Canevas ${ecran.canvas}, devicePixelRatio ${ecran.devicePixelRatio}`);
console.table({ "scène à l'arrêt": arret, "engin en mouvement": conduite });
console.log(
  `Seuil 30 FPS (1 % bas) : ${resultat.seuil30Fps ? "atteint ✓" : "non atteint ✗"}\nRésultats : ${file}`,
);
