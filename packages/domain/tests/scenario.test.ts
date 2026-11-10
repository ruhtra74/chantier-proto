import { describe, expect, it } from "vitest";
import chantier1Json from "../scenarios/chantier-1.json";
import { getScenario, listScenarios, scenarioSchema } from "../src";
import { scenarioInput } from "./helpers";

describe("scénario chantier-1", () => {
  it("est valide et enregistré dans le domaine", () => {
    expect(() => scenarioSchema.parse(chantier1Json)).not.toThrow();

    const scenario = getScenario("chantier-1");
    expect(scenario).toBeDefined();
    expect(scenario?.version).toBe(1);
    expect(scenario?.cones).toHaveLength(3);
    expect(listScenarios().map((entry) => entry.id)).toContain("chantier-1");
  });

  it("reprend les valeurs du document de conception", () => {
    const scenario = getScenario("chantier-1");
    expect(scenario?.fuel).toEqual({ capacity: 100, consumptionPerMeter: 1.5 });
    expect(scenario?.scoring).toEqual({ base: 1000, penaltyPerConeHit: 100, bonusPerFuelUnit: 5 });
    expect(scenario?.target).toEqual({ x: 0, z: 25, radius: 2 });
    expect(scenario?.cones.map((cone) => cone.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("refuse un identifiant inconnu ou une version inconnue", () => {
    expect(getScenario("inconnu")).toBeUndefined();
    expect(getScenario("chantier-1", 2)).toBeUndefined();
    expect(getScenario("chantier-1", 1)).toBeDefined();
  });
});

describe("T10 — validation d'un scénario invalide", () => {
  it("refuse une capacité de carburant nulle ou négative", () => {
    expect(
      scenarioSchema.safeParse(scenarioInput({ fuel: { capacity: 0, consumptionPerMeter: 1.5 } }))
        .success,
    ).toBe(false);
    expect(
      scenarioSchema.safeParse(scenarioInput({ fuel: { capacity: -10, consumptionPerMeter: 1.5 } }))
        .success,
    ).toBe(false);
  });

  it("refuse une consommation nulle ou négative", () => {
    expect(
      scenarioSchema.safeParse(scenarioInput({ fuel: { capacity: 100, consumptionPerMeter: 0 } }))
        .success,
    ).toBe(false);
  });

  it("refuse un rayon d'arrivée nul ou négatif", () => {
    expect(
      scenarioSchema.safeParse(scenarioInput({ target: { x: 0, z: 25, radius: 0 } })).success,
    ).toBe(false);
  });

  it("refuse deux cônes avec le même identifiant", () => {
    const result = scenarioSchema.safeParse(
      scenarioInput({
        cones: [
          { id: "c1", x: 0, z: 5 },
          { id: "c1", x: 1, z: 6 },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("refuse une liste de cônes vide", () => {
    expect(scenarioSchema.safeParse(scenarioInput({ cones: [] })).success).toBe(false);
  });

  it("refuse un identifiant de scénario vide", () => {
    expect(scenarioSchema.safeParse(scenarioInput({ id: "" })).success).toBe(false);
  });
});
