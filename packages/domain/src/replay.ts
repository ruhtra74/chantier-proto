import { reduce } from "./reducer";
import { createInitialState } from "./state";
import type { EngineEvent, GameState, LogEntry, Scenario } from "./types";

/** Rejoue un journal horodaté et retourne l'état final. */
export function replay(scenario: Scenario, entries: readonly LogEntry[]): GameState {
  let state = createInitialState(scenario);
  for (const entry of entries) {
    state = reduce(state, entry.event, scenario).state;
  }
  return state;
}

/** Rejoue une séquence d'événements sans horodatage (tests, outils). */
export function replayEvents(scenario: Scenario, events: readonly EngineEvent[]): GameState {
  let state = createInitialState(scenario);
  for (const event of events) {
    state = reduce(state, event, scenario).state;
  }
  return state;
}
