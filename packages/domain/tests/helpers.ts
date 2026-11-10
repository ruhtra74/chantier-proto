import type { z } from "zod";
import { scenarioSchema } from "../src/schemas";
import type { Scenario } from "../src/types";

type ScenarioInput = z.input<typeof scenarioSchema>;

const base = {
  id: "test",
  version: 1,
  fuel: { capacity: 100, consumptionPerMeter: 1.5 },
  scoring: { base: 1000, penaltyPerConeHit: 100, bonusPerFuelUnit: 5 },
  start: { x: 0, z: 0, headingDeg: 0 },
  target: { x: 0, z: 25, radius: 2 },
  cones: [
    { id: "c1", x: -3, z: 8 },
    { id: "c2", x: 2.5, z: 14 },
    { id: "c3", x: -1, z: 19 },
  ],
} satisfies ScenarioInput;

/** Copie profonde de la base, surchargeable, non validée (pour tester les rejets). */
export function scenarioInput(overrides: Partial<ScenarioInput> = {}): ScenarioInput {
  return structuredClone({ ...base, ...overrides });
}

export function makeScenario(overrides: Partial<ScenarioInput> = {}): Scenario {
  return scenarioSchema.parse(scenarioInput(overrides));
}
