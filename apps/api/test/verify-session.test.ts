import { describe, expect, it } from "vitest";
import { verifySession } from "../src/sessions/verify-session.js";
import { arrivalEvents, honestSubmission } from "./fixtures.js";

describe("verifySession (rejeu)", () => {
  it("confirme une session honnête et recalcule le score", () => {
    const result = verifySession(honestSubmission());

    // 22 m × 1,5 = 33 de carburant consommé, 67 restant : 1000 − 100 + 5 × 67 = 1235.
    expect(result).toEqual({
      ok: true,
      verification: { status: "finished", reason: "arrivee", serverScore: 1235, verified: true },
    });
  });

  it("détecte un score falsifié sans rejeter la session", () => {
    const submission = honestSubmission();
    submission.client.score += 100;

    const result = verifySession(submission);

    expect(result).toMatchObject({
      ok: true,
      verification: { verified: false, serverScore: 1235 },
    });
  });

  it("détecte une raison de fin falsifiée", () => {
    const submission = honestSubmission();
    submission.client.reason = "panne_seche";

    expect(verifySession(submission)).toMatchObject({
      ok: true,
      verification: { verified: false },
    });
  });

  it("détecte une partie annoncée terminée alors que le journal ne l'est pas", () => {
    const submission = honestSubmission(arrivalEvents.slice(0, 3));
    submission.client = { status: "finished", reason: "arrivee", score: 1000 };

    expect(verifySession(submission)).toMatchObject({
      ok: true,
      verification: { status: "running", reason: null, serverScore: 0, verified: false },
    });
  });

  it("vérifie une panne sèche (score nul)", () => {
    const events = [{ t: 100, event: { type: "MOVED" as const, distance: 80 } }];

    expect(verifySession(honestSubmission(events))).toEqual({
      ok: true,
      verification: { status: "finished", reason: "panne_seche", serverScore: 0, verified: true },
    });
  });

  it("ignore les événements postérieurs à la fin, comme le domaine", () => {
    const submission = honestSubmission();
    submission.events = [...submission.events, { t: 1300, event: { type: "CONE_HIT", id: "c1" } }];

    expect(verifySession(submission)).toMatchObject({
      ok: true,
      verification: { serverScore: 1235, verified: true },
    });
  });

  it("refuse un scénario ou une version inconnus", () => {
    expect(verifySession({ ...honestSubmission(), scenarioId: "inconnu" })).toMatchObject({
      ok: false,
    });
    expect(verifySession({ ...honestSubmission(), scenarioVersion: 2 })).toMatchObject({
      ok: false,
    });
  });

  it("refuse un journal contenant un cône inconnu du scénario", () => {
    const submission = honestSubmission();
    submission.events = [{ t: 50, event: { type: "CONE_HIT", id: "c9" } }, ...submission.events];

    expect(verifySession(submission)).toEqual({
      ok: false,
      message: "Événement invalide à l'indice 0 : cône inconnu du scénario",
    });
  });
});
