// Poids des fichiers et temps de premier chargement (étape 10.4) : ouverture directe de /jeu,
// cache vide (nouveau contexte à chaque essai), puis cache chaud ; en local et en 4G simulée.
//
//   pnpm mesures:chargement                options : --essais 3 --etiquette pc-bureau
//
// Prérequis : version de production démarrée (voir commun.mjs).
import { chromium } from "@playwright/test";
import {
  BASE_URL,
  arrondi,
  attendreScenePrete,
  enregistrer,
  machine,
  options,
  verifierServeur,
} from "./commun.mjs";

const opts = options({ essais: { type: "string", default: "3" } });
const essais = Number(opts.essais);
await verifierServeur();

const PROFILS = {
  local: null,
  "4g": { latency: 60, downloadThroughput: (9e6 / 8) | 0, uploadThroughput: (1.5e6 / 8) | 0 },
};

const browser = await chromium.launch();

/** Une ouverture de /jeu ; renvoie les temps (ms depuis le début de navigation) et les octets. */
async function chargement(context, profil) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  if (profil) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...profil });

  await page.goto(`${BASE_URL}/jeu`);
  await attendreScenePrete(page, 120_000);
  const mesure = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const sum = (filter) =>
      resources.filter(filter).reduce((total, r) => total + r.transferSize, 0) +
      (filter({ name: nav.name, initiatorType: "navigation" }) ? nav.transferSize : 0);
    return {
      ttfb: nav.responseStart,
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      scenePrete: performance.getEntriesByName("chantier:scene-prete")[0].startTime,
      octets: {
        total: sum(() => true),
        js: sum((r) => r.name.endsWith(".js")),
        glb: sum((r) => r.name.endsWith(".glb")),
        wasm: sum((r) => r.name.endsWith(".wasm")),
      },
    };
  });
  await page.close();
  return mesure;
}

const mediane = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const resultats = {};
for (const [nom, profil] of Object.entries(PROFILS)) {
  const froids = [];
  for (let i = 0; i < essais; i++) {
    const context = await browser.newContext(); // cache vide
    froids.push(await chargement(context, profil));
    await context.close();
  }
  const context = await browser.newContext();
  await chargement(context, profil);
  const chaud = await chargement(context, profil); // même contexte : cache HTTP rempli
  await context.close();

  resultats[nom] = {
    cacheVide: {
      scenePreteMs: Math.round(mediane(froids.map((m) => m.scenePrete))),
      loadMs: Math.round(mediane(froids.map((m) => m.load))),
      domContentLoadedMs: Math.round(mediane(froids.map((m) => m.domContentLoaded))),
      essaisScenePreteMs: froids.map((m) => Math.round(m.scenePrete)),
    },
    cacheChaud: { scenePreteMs: Math.round(chaud.scenePrete) },
    octetsTransferes: froids[0].octets,
  };
}
await browser.close();

// Poids des GLB tels que servis (identiques au disque).
const glb = {};
for (const name of ["engin.glb", "cone.glb"]) {
  const response = await fetch(`${BASE_URL}/models/${name}`);
  glb[name] = (await response.arrayBuffer()).byteLength;
}

const ko = (bytes) => `${arrondi(bytes / 1024).toLocaleString("fr-FR")} Ko`;
const file = enregistrer("chargement", opts.etiquette, {
  date: new Date().toISOString(),
  machine: machine(),
  baseUrl: BASE_URL,
  profils: { local: "sans limitation", "4g": "9 Mb/s descendant, 1,5 Mb/s montant, 60 ms" },
  glb,
  resultats,
});

console.log(`GLB : engin ${ko(glb["engin.glb"])}, cône ${ko(glb["cone.glb"])}`);
for (const [nom, r] of Object.entries(resultats)) {
  const o = r.octetsTransferes;
  console.log(
    `\n[${nom}] scène prête (cache vide, médiane de ${essais}) : ${r.cacheVide.scenePreteMs} ms` +
      ` — essais ${r.cacheVide.essaisScenePreteMs.join(" / ")} ms ; cache chaud : ${r.cacheChaud.scenePreteMs} ms` +
      `\n        load ${r.cacheVide.loadMs} ms ; transféré ${ko(o.total)} (JS ${ko(o.js)}, WASM ${ko(o.wasm)}, GLB ${ko(o.glb)})`,
  );
}
console.log(`\nRésultats : ${file}`);
