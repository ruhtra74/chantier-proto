import type { GameState, Scenario } from "./types";

export function createInitialState(scenario: Scenario): GameState {
  return {
    status: "running",
    fuel: scenario.fuel.capacity,
    distance: 0,
    conesHit: [],
  };
}
