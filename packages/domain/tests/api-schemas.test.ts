import { describe, expect, it } from "vitest";
import { sessionCreatedSchema, sessionDetailSchema, sessionListSchema } from "../src";

const summary = {
  id: "8a3f",
  createdAt: "2026-11-12T16:33:46.449Z",
  scenarioId: "chantier-1",
  status: "finished",
  reason: "arrivee",
  score: 1235,
  verified: true,
};

describe("validation des réponses de l'API", () => {
  it("accepte une session créée, y compris sans raison de fin", () => {
    const created = {
      id: "8a3f",
      serverScore: 0,
      verified: false,
      status: "running",
      reason: null,
    };
    expect(sessionCreatedSchema.safeParse(created).success).toBe(true);
  });

  it("accepte une liste de sessions avec des dates ISO", () => {
    expect(sessionListSchema.safeParse([summary]).success).toBe(true);
    expect(sessionListSchema.safeParse([{ ...summary, createdAt: "hier" }]).success).toBe(false);
  });

  it("valide le journal contenu dans le détail d'une session", () => {
    const { score, ...rest } = summary;
    const detail = {
      ...rest,
      userId: "demo",
      scenarioVersion: 1,
      clientScore: score,
      serverScore: score,
      durationMs: 1200,
      events: [{ t: 100, event: { type: "MOVED", distance: 2 } }],
    };

    expect(sessionDetailSchema.safeParse(detail).success).toBe(true);
    expect(
      sessionDetailSchema.safeParse({
        ...detail,
        events: [{ t: 100, event: { type: "MOVED", distance: -2 } }],
      }).success,
    ).toBe(false);
  });

  it("refuse une raison de fin inconnue", () => {
    expect(sessionListSchema.safeParse([{ ...summary, reason: "abandon" }]).success).toBe(false);
  });
});
