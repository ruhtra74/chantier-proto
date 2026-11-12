import { mkdirSync, writeFileSync } from "node:fs";
import { hostname, cpus, totalmem } from "node:os";
import { parseArgs } from "node:util";

export const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

/**
 * GPU dédié sur un portable hybride (PRIME offload) : variables NVIDIA (DRI_PRIME pour AMD) et
 * passage de Chromium en X11 — sous Wayland, Chromium ignore ces variables et reste sur le GPU
 * intégré (vérifié sur Ubuntu avec une RTX 3050, pilote 595).
 */
export const GPU_DEDIE_ENV = {
  __NV_PRIME_RENDER_OFFLOAD: "1",
  __GLX_VENDOR_LIBRARY_NAME: "nvidia",
  __VK_LAYER_NV_optimus: "NVIDIA_only",
  DRI_PRIME: "1",
};
export const GPU_DEDIE_ARGS = ["--ozone-platform=x11"];

export function options(extra = {}) {
  return parseArgs({
    // `pnpm mesures:fps -- --gpu dedie` transmet le `--` tel quel : on l'ignore.
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      gpu: { type: "string", default: "defaut" }, // defaut | dedie
      etiquette: { type: "string", default: "" },
      ...extra,
    },
  }).values;
}

/** Vérifie que le serveur de production répond avant de lancer une mesure. */
export async function verifierServeur() {
  try {
    const response = await fetch(`${BASE_URL}/api/scenarios/chantier-1`);
    if (response.ok) return;
  } catch {
    // traité ci-dessous
  }
  console.error(
    `Serveur injoignable sur ${BASE_URL}. Lancer la version de production :\n` +
      "  pnpm build && pnpm --filter api db:deploy && pnpm --filter api start\n" +
      "ou : docker compose up --build   (BASE_URL=... pour une autre adresse)",
  );
  process.exit(1);
}

export function machine() {
  return {
    hote: hostname(),
    processeur: cpus()[0]?.model ?? "inconnu",
    coeurs: cpus().length,
    memoireGo: Math.round(totalmem() / 1024 ** 3),
    plateforme: `${process.platform} ${process.arch}`,
  };
}

/** Nom du GPU utilisé par WebGL dans la page (extension WEBGL_debug_renderer_info). */
export function gpuDeLaPage(page) {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "WebGL2 indisponible";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
}

export function attendreScenePrete(page, timeout = 60_000) {
  return page.waitForFunction(
    () => performance.getEntriesByName("chantier:scene-prete").length > 0,
    undefined,
    { timeout },
  );
}

/** Écrit les résultats dans e2e/resultats/AAAA-MM-JJTHH-MM-<type>-<étiquette>.json. */
export function enregistrer(type, etiquette, data) {
  const dir = new URL("../resultats/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(":", "-");
  const name = [stamp, type, etiquette].filter(Boolean).join("-") + ".json";
  const file = new URL(name, dir);
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return file.pathname;
}

export const arrondi = (value, digits = 1) => Number(value.toFixed(digits));
