import { createInitialState, reduce } from '@chantier/domain';
import type {
  DomainCommand,
  EngineEvent,
  GameResult,
  GameState,
  LogEntry,
  Scenario,
  SessionSubmission,
} from '@chantier/domain';
import { EventLog } from './event-log';

/** Valeurs affichées par le HUD, déjà calculées par le domaine. */
export type HudSnapshot = {
  fuel: number;
  distance: number;
  conesHit: number;
};

export type GameControllerOptions = {
  scenario: Scenario;
  /** Horloge injectable (tests, outils) ; `performance.now` par défaut. */
  now?: () => number;
  onHud: (hud: HudSnapshot) => void;
  onEnd: (result: GameResult) => void;
};

/**
 * Seul endroit où les couches se rencontrent : reçoit les événements du moteur, applique le
 * réducteur pur du domaine et distribue les commandes (HUD, fin de partie).
 *
 * Le contrôleur ne connaît ni Babylon ni Angular : il ne manipule que les types du domaine.
 */
export class GameController {
  private state: GameState;
  private readonly log: EventLog;

  constructor(private readonly options: GameControllerOptions) {
    this.state = createInitialState(options.scenario);
    this.log = new EventLog(options.now);
    this.publishHud();
  }

  get currentState(): GameState {
    return this.state;
  }

  get entries(): readonly LogEntry[] {
    return this.log.entries;
  }

  get durationMs(): number {
    return this.log.durationMs;
  }

  get finished(): boolean {
    return this.state.status === 'finished';
  }

  handleEvent(event: EngineEvent): void {
    if (this.state.status === 'finished') return;

    this.log.append(event);
    const { state, commands } = reduce(this.state, event, this.options.scenario);
    this.state = state;

    for (const command of commands) {
      this.applyCommand(command);
    }
  }

  /** État final au format attendu par l'API, journal et durée compris. */
  submission(): SessionSubmission {
    return this.log.toSubmission(this.options.scenario, {
      status: this.state.status,
      ...this.state.result,
      score: this.state.result?.score ?? 0,
    });
  }

  private applyCommand(command: DomainCommand): void {
    if (command.type === 'UPDATE_HUD') {
      this.options.onHud({
        fuel: command.fuel,
        distance: command.distance,
        conesHit: command.conesHit,
      });
      return;
    }

    this.options.onEnd({ reason: command.reason, score: command.score });
  }

  private publishHud(): void {
    this.options.onHud({
      fuel: this.state.fuel,
      distance: this.state.distance,
      conesHit: this.state.conesHit.length,
    });
  }
}
