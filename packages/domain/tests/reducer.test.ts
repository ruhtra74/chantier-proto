import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../src";
import { makeScenario } from "./helpers";

describe("createInitialState", () => {
  it("part avec le plein, à zéro mètre et aucun cône touché", () => {
    const state = createInitialState(makeScenario());
    expect(state).toEqual({
      status: "running",
      fuel: 100,
      distance: 0,
      conesHit: [],
    });
  });
});

describe("T1 — consommation proportionnelle à la distance", () => {
  it("consomme 1,5 par mètre et cumule la distance", () => {
    const scenario = makeScenario();
    const initial = createInitialState(scenario);

    const { state, commands } = reduce(initial, { type: "MOVED", distance: 10 }, scenario);

    expect(state.fuel).toBe(85);
    expect(state.distance).toBe(10);
    expect(state.status).toBe("running");
    expect(commands).toEqual([{ type: "UPDATE_HUD", fuel: 85, conesHit: 0, distance: 10 }]);
  });

  it("additionne les lots successifs", () => {
    const scenario = makeScenario();
    let state = createInitialState(scenario);

    state = reduce(state, { type: "MOVED", distance: 4 }, scenario).state;
    state = reduce(state, { type: "MOVED", distance: 6 }, scenario).state;

    expect(state.distance).toBe(10);
    expect(state.fuel).toBe(85);
  });
});

describe("T2 — panne sèche", () => {
  it("termine la partie à zéro carburant avec un score nul", () => {
    const scenario = makeScenario({ fuel: { capacity: 10, consumptionPerMeter: 2 } });
    const initial = createInitialState(scenario);

    const { state, commands } = reduce(initial, { type: "MOVED", distance: 5 }, scenario);

    expect(state.fuel).toBe(0);
    expect(state.status).toBe("finished");
    expect(state.result).toEqual({ reason: "panne_seche", score: 0 });
    expect(commands).toEqual([{ type: "END", reason: "panne_seche", score: 0 }]);
  });

  it("borne le carburant à zéro même si la distance dépasse l'autonomie", () => {
    const scenario = makeScenario();
    const initial = createInitialState(scenario);

    const { state } = reduce(initial, { type: "MOVED", distance: 1000 }, scenario);

    expect(state.fuel).toBe(0);
    expect(state.status).toBe("finished");
  });
});

describe("T3 — un cône n'est compté qu'une fois", () => {
  it("ignore le second contact avec le même cône", () => {
    const scenario = makeScenario();
    const initial = createInitialState(scenario);

    const first = reduce(initial, { type: "CONE_HIT", id: "c1" }, scenario);
    expect(first.state.conesHit).toEqual(["c1"]);
    expect(first.commands).toEqual([{ type: "UPDATE_HUD", fuel: 100, conesHit: 1, distance: 0 }]);

    const second = reduce(first.state, { type: "CONE_HIT", id: "c1" }, scenario);
    expect(second.state).toBe(first.state);
    expect(second.commands).toEqual([]);
  });

  it("compte des cônes différents séparément", () => {
    const scenario = makeScenario();
    let state = createInitialState(scenario);

    state = reduce(state, { type: "CONE_HIT", id: "c1" }, scenario).state;
    state = reduce(state, { type: "CONE_HIT", id: "c2" }, scenario).state;

    expect(state.conesHit).toEqual(["c1", "c2"]);
  });
});

describe("T4 — identifiant de cône inconnu", () => {
  it("ignore un cône absent du scénario", () => {
    const scenario = makeScenario();
    const initial = createInitialState(scenario);

    const { state, commands } = reduce(initial, { type: "CONE_HIT", id: "inconnu" }, scenario);

    expect(state).toBe(initial);
    expect(commands).toEqual([]);
  });
});

describe("arrivée", () => {
  it("termine la partie et émet END avec le score calculé", () => {
    const scenario = makeScenario();
    const initial = createInitialState(scenario);

    const { state, commands } = reduce(initial, { type: "REACHED_TARGET" }, scenario);

    // base 1000 + 5 × 100 (carburant entier restant) = 1500
    expect(state.status).toBe("finished");
    expect(state.result).toEqual({ reason: "arrivee", score: 1500 });
    expect(commands).toEqual([{ type: "END", reason: "arrivee", score: 1500 }]);
  });
});

describe("T7 — événements après la fin", () => {
  it("ignore tout événement une fois la partie terminée", () => {
    const scenario = makeScenario();
    const finished = reduce(
      createInitialState(scenario),
      { type: "REACHED_TARGET" },
      scenario,
    ).state;

    for (const event of [
      { type: "MOVED", distance: 10 },
      { type: "CONE_HIT", id: "c1" },
      { type: "REACHED_TARGET" },
    ] as const) {
      const result = reduce(finished, event, scenario);
      expect(result.state).toBe(finished);
      expect(result.commands).toEqual([]);
    }
  });
});
