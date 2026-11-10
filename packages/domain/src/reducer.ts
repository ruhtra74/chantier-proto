import { computeScore } from "./score";
import type { DomainCommand, EngineEvent, GameState, ReduceResult, Scenario } from "./types";

function hudCommand(state: GameState): DomainCommand {
  return {
    type: "UPDATE_HUD",
    fuel: state.fuel,
    conesHit: state.conesHit.length,
    distance: state.distance,
  };
}

/**
 * Réducteur pur : (état, événement, scénario) -> (nouvel état, commandes).
 * Aucune horloge, aucun aléatoire, aucune dépendance extérieure.
 */
export function reduce(state: GameState, event: EngineEvent, scenario: Scenario): ReduceResult {
  if (state.status === "finished") {
    return { state, commands: [] };
  }

  switch (event.type) {
    case "MOVED": {
      const distance = state.distance + event.distance;
      const fuel = Math.max(0, state.fuel - event.distance * scenario.fuel.consumptionPerMeter);

      if (fuel <= 0) {
        const next: GameState = {
          ...state,
          distance,
          fuel: 0,
          status: "finished",
          result: { reason: "panne_seche", score: 0 },
        };
        return {
          state: next,
          commands: [{ type: "END", reason: "panne_seche", score: 0 }],
        };
      }

      const next: GameState = { ...state, distance, fuel };
      return { state: next, commands: [hudCommand(next)] };
    }

    case "CONE_HIT": {
      const isKnown = scenario.cones.some((cone) => cone.id === event.id);
      if (!isKnown || state.conesHit.includes(event.id)) {
        return { state, commands: [] };
      }

      const next: GameState = { ...state, conesHit: [...state.conesHit, event.id] };
      return { state: next, commands: [hudCommand(next)] };
    }

    case "REACHED_TARGET": {
      const score = computeScore(scenario, state.conesHit.length, state.fuel);
      const next: GameState = {
        ...state,
        status: "finished",
        result: { reason: "arrivee", score },
      };
      return {
        state: next,
        commands: [{ type: "END", reason: "arrivee", score }],
      };
    }

    default: {
      const unreachable: never = event;
      throw new Error(`Événement non géré : ${JSON.stringify(unreachable)}`);
    }
  }
}
