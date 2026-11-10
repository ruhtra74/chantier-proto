import type { Scenario } from "./types";

/**
 * Score à l'arrivée :
 * max(0, base − pénalitéParCône × cônesTouchés + bonusParCarburant × partieEntière(carburantRestant))
 */
export function computeScore(
  scenario: Scenario,
  conesHitCount: number,
  fuelRemaining: number,
): number {
  const { base, penaltyPerConeHit, bonusPerFuelUnit } = scenario.scoring;
  const raw =
    base - penaltyPerConeHit * conesHitCount + bonusPerFuelUnit * Math.floor(fuelRemaining);
  return Math.max(0, raw);
}
