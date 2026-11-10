import chantier1Json from "../scenarios/chantier-1.json";
import { scenarioSchema } from "./schemas";
import type { Scenario } from "./types";

/** Validation au chargement : un scénario invalide fait échouer le démarrage. */
export const chantier1: Scenario = scenarioSchema.parse(chantier1Json);

const registry: ReadonlyMap<string, Scenario> = new Map([[chantier1.id, chantier1]]);

export function getScenario(id: string, version?: number): Scenario | undefined {
  const scenario = registry.get(id);
  if (!scenario) return undefined;
  if (version !== undefined && scenario.version !== version) return undefined;
  return scenario;
}

export function listScenarios(): Scenario[] {
  return [...registry.values()];
}
