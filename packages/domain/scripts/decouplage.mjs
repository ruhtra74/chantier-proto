// Test de découplage (étape 10.2, critère C4) : une partie complète jouée sur le paquet `domain`
// compilé, dans Node seul — ni navigateur, ni Babylon.js, ni Angular, ni réseau.
//
// Usage : pnpm --filter @chantier/domain decouplage   (ou `pnpm decouplage` à la racine)
import { createRequire } from "node:module";
import { chantier1, createInitialState, reduce, replay } from "../dist/index.js";

const failures = [];
function check(label, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) failures.push(label);
  console.log(`${ok ? "✓" : "✗"} ${label} : ${actual}${ok ? "" : ` (attendu ${expected})`}`);
}

/** Séquence d'événements telle que le moteur l'émettrait : 22 m par lots, un cône, l'arrivée. */
const events = [
  ...Array.from({ length: 11 }, () => ({ type: "MOVED", distance: 2 })),
  { type: "CONE_HIT", id: "c2" },
  { type: "CONE_HIT", id: "c2" }, // répété : compté une seule fois
  { type: "CONE_HIT", id: "inconnu" }, // inconnu : ignoré
  { type: "REACHED_TARGET" },
  { type: "MOVED", distance: 5 }, // après la fin : ignoré
];

// 1. Application pas à pas, comme le GameController du navigateur.
let state = createInitialState(chantier1);
const commands = [];
for (const event of events) {
  const result = reduce(state, event, chantier1);
  state = result.state;
  commands.push(...result.commands);
}

// Score attendu, calculé à la main : 22 m × 1,5 = 33 de carburant, reste 67 ;
// 1000 − 100 × 1 cône + 5 × 67 = 1235.
check("statut final", state.status, "finished");
check("raison", state.result?.reason, "arrivee");
check("distance (m)", state.distance, 22);
check("carburant restant", state.fuel, 67);
check("cônes touchés", state.conesHit.length, 1);
check("score", state.result?.score, 1235);
check("commande END émise une fois", commands.filter((c) => c.type === "END").length, 1);

// 2. Rejeu du journal horodaté, comme le serveur.
const journal = events.map((event, i) => ({ t: i * 100, event }));
check("score du rejeu identique", replay(chantier1, journal).result?.score, 1235);

// 3. Panne sèche : 70 m consomment 105 unités sur 100.
const dry = replay(chantier1, [{ t: 0, event: { type: "MOVED", distance: 70 } }]);
check("panne sèche : raison", dry.result?.reason, "panne_seche");
check("panne sèche : score", dry.result?.score, 0);

// 4. Les bibliothèques 3D, d'interface et réseau ne sont même pas accessibles depuis le domaine
// (pnpm n'expose à un paquet que ses propres dépendances : ici, Zod seulement).
const require = createRequire(import.meta.url);
const reachable = ["@babylonjs/core", "@angular/core", "@nestjs/core", "@prisma/client"].filter(
  (name) => {
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  },
);
check(
  "bibliothèques 3D / interface / serveur accessibles",
  reachable.join(", ") || "aucune",
  "aucune",
);
check("zod accessible (seule dépendance)", Boolean(require.resolve("zod")), true);
check("environnement sans DOM", typeof globalThis.document, "undefined");

if (failures.length > 0) {
  console.error(`\nÉchec du test de découplage : ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nTest de découplage réussi : le domaine joue une partie complète sans aucune 3D.");
