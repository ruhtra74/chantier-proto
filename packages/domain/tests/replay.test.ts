import { describe, expect, it } from "vitest";
import { createInitialState, reduce, replay, replayEvents } from "../src";
import type { EngineEvent, LogEntry } from "../src";
import { makeScenario } from "./helpers";

const events: EngineEvent[] = [
  { type: "MOVED", distance: 5 },
  { type: "CONE_HIT", id: "c1" },
  { type: "MOVED", distance: 5 },
  { type: "CONE_HIT", id: "c2" },
  { type: "MOVED", distance: 5 },
];

describe("T8 — le rejeu produit le même état que l'application pas à pas", () => {
  it("rejoue une séquence d'événements", () => {
    const scenario = makeScenario();

    let stepByStep = createInitialState(scenario);
    for (const event of events) {
      stepByStep = reduce(stepByStep, event, scenario).state;
    }

    expect(replayEvents(scenario, events)).toEqual(stepByStep);
  });

  it("rejoue un journal horodaté", () => {
    const scenario = makeScenario();
    const log: LogEntry[] = events.map((event, index) => ({ t: index * 100, event }));

    expect(replay(scenario, log)).toEqual(replayEvents(scenario, events));
  });

  it("ignore les événements situés après la fin lors du rejeu", () => {
    const scenario = makeScenario();
    const log: LogEntry[] = [
      { t: 0, event: { type: "MOVED", distance: 4 } },
      { t: 100, event: { type: "REACHED_TARGET" } },
      { t: 200, event: { type: "MOVED", distance: 100 } },
      { t: 300, event: { type: "CONE_HIT", id: "c1" } },
    ];

    const state = replay(scenario, log);

    expect(state.status).toBe("finished");
    expect(state.result).toEqual({ reason: "arrivee", score: 1470 });
    expect(state.distance).toBe(4);
    expect(state.conesHit).toEqual([]);
  });

  it("rejoue une partie complète et retrouve le score attendu", () => {
    const scenario = makeScenario();
    const log: LogEntry[] = [
      { t: 0, event: { type: "MOVED", distance: 5 } },
      { t: 100, event: { type: "CONE_HIT", id: "c1" } },
      { t: 200, event: { type: "MOVED", distance: 5 } },
      { t: 300, event: { type: "CONE_HIT", id: "c2" } },
      { t: 400, event: { type: "MOVED", distance: 15 } },
      { t: 500, event: { type: "REACHED_TARGET" } },
    ];

    const state = replay(scenario, log);

    // 25 m à 1,5/m -> 62,5 de carburant ; 1000 - 200 + 5 × 62 = 1110
    expect(state.distance).toBe(25);
    expect(state.fuel).toBeCloseTo(62.5, 10);
    expect(state.conesHit).toEqual(["c1", "c2"]);
    expect(state.result).toEqual({ reason: "arrivee", score: 1110 });
  });
});
