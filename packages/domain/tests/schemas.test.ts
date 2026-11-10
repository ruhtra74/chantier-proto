import { describe, expect, it } from "vitest";
import {
  domainCommandSchema,
  engineEventSchema,
  gameStateSchema,
  logEntrySchema,
  sessionSubmissionSchema,
} from "../src";

describe("T9 — validation des événements moteur", () => {
  it("accepte les trois événements du contrat", () => {
    expect(engineEventSchema.safeParse({ type: "MOVED", distance: 0.8 }).success).toBe(true);
    expect(engineEventSchema.safeParse({ type: "CONE_HIT", id: "c1" }).success).toBe(true);
    expect(engineEventSchema.safeParse({ type: "REACHED_TARGET" }).success).toBe(true);
  });

  it("refuse une distance négative", () => {
    expect(engineEventSchema.safeParse({ type: "MOVED", distance: -1 }).success).toBe(false);
  });

  it("refuse une distance non finie", () => {
    expect(engineEventSchema.safeParse({ type: "MOVED", distance: Number.NaN }).success).toBe(
      false,
    );
    expect(engineEventSchema.safeParse({ type: "MOVED", distance: Infinity }).success).toBe(false);
  });

  it("refuse un identifiant de cône vide", () => {
    expect(engineEventSchema.safeParse({ type: "CONE_HIT", id: "" }).success).toBe(false);
  });

  it("refuse un type inconnu", () => {
    expect(engineEventSchema.safeParse({ type: "TELEPORT" }).success).toBe(false);
    expect(engineEventSchema.safeParse({}).success).toBe(false);
  });
});

describe("validation des commandes", () => {
  it("accepte UPDATE_HUD et END", () => {
    expect(
      domainCommandSchema.safeParse({
        type: "UPDATE_HUD",
        fuel: 42,
        conesHit: 1,
        distance: 12,
      }).success,
    ).toBe(true);
    expect(
      domainCommandSchema.safeParse({ type: "END", reason: "arrivee", score: 800 }).success,
    ).toBe(true);
  });

  it("refuse une raison de fin inconnue", () => {
    expect(
      domainCommandSchema.safeParse({ type: "END", reason: "abandon", score: 0 }).success,
    ).toBe(false);
  });
});

describe("validation du journal et de la soumission", () => {
  it("refuse un horodatage négatif", () => {
    expect(logEntrySchema.safeParse({ t: -1, event: { type: "REACHED_TARGET" } }).success).toBe(
      false,
    );
  });

  it("accepte un journal horodaté valide", () => {
    expect(
      logEntrySchema.safeParse({ t: 120, event: { type: "MOVED", distance: 0.8 } }).success,
    ).toBe(true);
  });

  it("accepte une soumission conforme au contrat de l'API", () => {
    const submission = {
      scenarioId: "chantier-1",
      scenarioVersion: 1,
      events: [
        { t: 120, event: { type: "MOVED", distance: 0.8 } },
        { t: 500, event: { type: "REACHED_TARGET" } },
      ],
      client: { status: "finished", reason: "arrivee", score: 840 },
      durationMs: 45230,
    };

    expect(sessionSubmissionSchema.safeParse(submission).success).toBe(true);
  });

  it("refuse une soumission sans événements ou avec un score négatif", () => {
    const base = {
      scenarioId: "chantier-1",
      scenarioVersion: 1,
      events: [],
      client: { status: "finished", reason: "arrivee", score: 840 },
      durationMs: 45230,
    };

    expect(sessionSubmissionSchema.safeParse(base).success).toBe(true);
    expect(
      sessionSubmissionSchema.safeParse({
        ...base,
        client: { ...base.client, score: -1 },
      }).success,
    ).toBe(false);
    expect(sessionSubmissionSchema.safeParse({ ...base, events: "nope" }).success).toBe(false);
  });
});

describe("validation de l'état", () => {
  it("accepte un état en cours et un état terminé", () => {
    expect(
      gameStateSchema.safeParse({ status: "running", fuel: 10, distance: 2, conesHit: [] }).success,
    ).toBe(true);
    expect(
      gameStateSchema.safeParse({
        status: "finished",
        fuel: 0,
        distance: 12,
        conesHit: ["c1"],
        result: { reason: "panne_seche", score: 0 },
      }).success,
    ).toBe(true);
  });

  it("refuse un carburant négatif", () => {
    expect(
      gameStateSchema.safeParse({ status: "running", fuel: -1, distance: 0, conesHit: [] }).success,
    ).toBe(false);
  });
});
