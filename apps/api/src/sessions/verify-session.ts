import { getScenario, replay, type GameState, type SessionSubmission } from "@chantier/domain";

export type Verification = {
  /** Issue recalculée par le serveur, qui fait foi. */
  status: GameState["status"];
  reason: "arrivee" | "panne_seche" | null;
  serverScore: number;
  /** Vrai si le statut, la raison et le score annoncés par le client sont identiques au rejeu. */
  verified: boolean;
};

export type VerificationResult =
  { ok: true; verification: Verification } | { ok: false; message: string };

/**
 * Rejoue le journal avec le même paquet `domain` que le navigateur et compare l'issue au
 * résultat annoncé par le client. Une session falsifiée n'est pas rejetée : elle est marquée
 * `verified = false`. Seuls un scénario inconnu ou un événement invalide la rendent irrecevable.
 */
export function verifySession(submission: SessionSubmission): VerificationResult {
  const scenario = getScenario(submission.scenarioId, submission.scenarioVersion);
  if (!scenario) {
    return {
      ok: false,
      message: `Scénario inconnu : ${submission.scenarioId} (version ${submission.scenarioVersion})`,
    };
  }

  // Le domaine ignore un CONE_HIT inconnu ; dans un journal soumis, c'est un événement invalide.
  const coneIds = new Set(scenario.cones.map((cone) => cone.id));
  const unknownIndex = submission.events.findIndex(
    (entry) => entry.event.type === "CONE_HIT" && !coneIds.has(entry.event.id),
  );
  if (unknownIndex !== -1) {
    return {
      ok: false,
      message: `Événement invalide à l'indice ${unknownIndex} : cône inconnu du scénario`,
    };
  }

  const state = replay(scenario, submission.events);
  const serverScore = state.result?.score ?? 0;
  const reason = state.result?.reason ?? null;
  const verified =
    submission.client.status === state.status &&
    (submission.client.reason ?? null) === reason &&
    submission.client.score === serverScore;

  return { ok: true, verification: { status: state.status, reason, serverScore, verified } };
}
