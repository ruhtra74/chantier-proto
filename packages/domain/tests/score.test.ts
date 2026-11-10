import { describe, expect, it } from "vitest";
import { computeScore } from "../src";
import { makeScenario } from "./helpers";

describe("T5 — score à l'arrivée", () => {
  // capacité 10, consommation 1 : sans déplacement le carburant restant vaut 10
  const scenario = makeScenario({ fuel: { capacity: 10, consumptionPerMeter: 1 } });

  it("sans cône touché : base + bonus de carburant", () => {
    expect(computeScore(scenario, 0, 10)).toBe(1050);
  });

  it("avec un cône touché : une pénalité", () => {
    expect(computeScore(scenario, 1, 10)).toBe(950);
  });

  it("avec trois cônes touchés : trois pénalités", () => {
    expect(computeScore(scenario, 3, 10)).toBe(750);
  });

  it("utilise la partie entière du carburant restant", () => {
    expect(computeScore(scenario, 0, 12.9)).toBe(1060);
  });

  it("pénalise davantage un carburant plus faible", () => {
    expect(computeScore(scenario, 0, 4)).toBe(1020);
  });
});

describe("T6 — le score ne peut pas être négatif", () => {
  it("retourne 0 quand les pénalités dépassent la base", () => {
    const scenario = makeScenario({
      scoring: { base: 0, penaltyPerConeHit: 500, bonusPerFuelUnit: 0 },
    });

    expect(computeScore(scenario, 3, 0)).toBe(0);
    expect(computeScore(scenario, 10, 0)).toBe(0);
  });
});
