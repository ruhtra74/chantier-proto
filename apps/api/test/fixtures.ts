import { chantier1, replay, type LogEntry, type SessionSubmission } from "@chantier/domain";

/** Partie réaliste sur `chantier-1` : 22 m par lots, un cône touché, arrivée. */
export const arrivalEvents: LogEntry[] = [
  ...Array.from({ length: 11 }, (_, i) => ({
    t: (i + 1) * 100,
    event: { type: "MOVED" as const, distance: 2 },
  })),
  { t: 1150, event: { type: "CONE_HIT", id: "c2" } },
  { t: 1200, event: { type: "REACHED_TARGET" } },
];

/** Soumission honnête : le résultat client est celui que calcule le domaine. */
export function honestSubmission(events: LogEntry[] = arrivalEvents): SessionSubmission {
  const state = replay(chantier1, events);
  return {
    scenarioId: chantier1.id,
    scenarioVersion: chantier1.version,
    events,
    client: {
      status: state.status,
      reason: state.result?.reason,
      score: state.result?.score ?? 0,
    },
    durationMs: events.at(-1)?.t ?? 0,
  };
}
