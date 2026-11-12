import type { EngineEvent, LogEntry, SessionSubmission } from '@chantier/domain';

type ScenarioIdentity = { id: string; version: number };

/**
 * Journal horodaté des événements émis par le moteur. C'est la source du rejeu côté serveur :
 * le domaine ne voit que des événements, jamais la 3D ni l'horloge.
 *
 * Le temps est fourni par l'adaptateur (`performance.now` par défaut) pour que le domaine et le
 * journal restent testables sans dépendre d'une horloge globale.
 */
export class EventLog {
  private readonly items: LogEntry[] = [];
  private startedAt: number;

  constructor(private readonly now: () => number = () => performance.now()) {
    this.startedAt = now();
  }

  get entries(): readonly LogEntry[] {
    return this.items;
  }

  /** Durée écoulée depuis le début de la partie, en millisecondes. */
  get durationMs(): number {
    return elapsedSince(this.startedAt, this.now());
  }

  append(event: EngineEvent): LogEntry {
    const entry: LogEntry = { t: elapsedSince(this.startedAt, this.now()), event };
    this.items.push(entry);
    return entry;
  }

  clear(): void {
    this.items.length = 0;
    this.startedAt = this.now();
  }

  /** Charge utile à envoyer à l'API (étape 8), avec l'état final annoncé par le client. */
  toSubmission(scenario: ScenarioIdentity, client: SessionSubmission['client']): SessionSubmission {
    return {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      events: [...this.items],
      client,
      durationMs: this.durationMs,
    };
  }
}

function elapsedSince(startedAt: number, now: number): number {
  return Math.max(0, Math.round(now - startedAt));
}
